import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/demo-auth.css'

export default function Login() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('login')
  const [showPwd, setShowPwd] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })
  const [langOpen, setLangOpen] = useState(false)
  const langDdRef = useRef(null)

  const currentLang = i18n.language || 'en'

  // form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Если пришли после OAuth редиректа: вытащить ?token= и сохранить
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      try { window.localStorage.setItem('pp-token', token) } catch (_) {}
      // очищаем query и идем на boards
      navigate('/boards', { replace: true })
    }
  }, [navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      const data = await res.json().catch(()=>({}))
      if (!res.ok) {
        const msg = data?.error?.message || 'Ошибка авторизации'
        throw new Error(msg)
      }
      const token = data?.token
      if (token) {
        window.localStorage.setItem('pp-token', token)
      }
      navigate('/boards')
    } catch (err) {
      setError(err.message || 'Ошибка запроса')
    } finally {
      setLoading(false)
    }
  }

  const pwdInputType = useMemo(() => (showPwd ? 'text' : 'password'), [showPwd])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Persist selection
      window.localStorage.setItem('pp-theme', theme)
      // Sync class on <html> so global styles and other components can react
      const rootEl = document.documentElement
      rootEl.classList.remove('theme-light', 'theme-dark')
      rootEl.classList.add(`theme-${theme}`)
    }
  }, [theme])

  const changeLanguage = (newLang) => {
    i18n.changeLanguage(newLang)
    setLangOpen(false)
  }

  // Закрытие выпадашки языка по клику вне и по Esc
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

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

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
            <a className="nav__link" href="#" onClick={(e)=>e.preventDefault()}>Guide (in the future)</a>
            <a className="nav__link" href="https://github.com/Zherikhov/EasyPlanningPoker" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a className="nav__link" href="https://easyplanningpoker.atlassian.net/servicedesk/customer/portal/34" target="_blank" rel="noopener noreferrer">{t('common.support', 'Support')}</a>
            {/* Кастомный селект языка для стабильной стилизации опций */}
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
          </div>
        </div>
      </header>

      <main className="hero">
        <div className="hero__bg" aria-hidden="true"></div>

        <section className="hero__inner">
          <div className="hero__left">
            <h1 className="h1">{t('login.heroTitle', 'Free Planning Poker App')}</h1>
            <p className="lead">{t('login.heroSubtitle', 'Estimate user stories in an Agile/Scrum team collaboratively.')}</p>

            <p className="desc">
              {t('login.heroDesc', 'Free/Open source Planning Poker Web App to estimate user stories for Agile/Scrum teams. Create a session and invite your team members to estimate user stories efficiently.')}
            </p>

            <div className="cta">
              <a className="btn btn--primary btn--lg" href="#" onClick={(e)=>{e.preventDefault(); navigate('/register')}}>{t('login.getStarted', 'Get Started for Free')}</a>
            </div>
          </div>

          <div className="hero__right">
            <div className="authCard" role="region" aria-label="Authorization">
              <div className="authTabs" role="tablist" aria-label="Auth tabs">
                <button
                  className={`authTabs__tab ${activeTab==='login' ? 'is-active' : ''}`}
                  role="tab"
                  aria-selected={activeTab==='login'}
                  onClick={()=>setActiveTab('login')}
                >
                  {t('common.login', 'Log In')}
                </button>
                <button
                  className={`authTabs__tab ${activeTab==='signup' ? 'is-active' : ''}`}
                  role="tab"
                  aria-selected={activeTab==='signup'}
                  onClick={()=>setActiveTab('signup')}
                >
                  {t('login.signUpTab', 'Sign Up')}
                </button>
              </div>
              {activeTab === 'login' && (
                <form className="authForm" action="#" onSubmit={onSubmit}>
                  <label className="field">
                    <span className="field__label">{t('login.email', 'Email')}</span>
                    <span className="field__control">
                      <input className="input" type="email" placeholder={t('login.email', 'Email')} autoComplete="email" required value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)} />
                      <span className="field__icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" />
                          <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </span>
                    </span>
                  </label>

                  <label className="field">
                    <span className="field__label">{t('login.password', 'Password')}</span>
                    <span className="field__control">
                      <input id="pwd" className="input" type={pwdInputType} placeholder={t('login.password', 'Password')} autoComplete="current-password" required value={loginPassword} onChange={(e)=>setLoginPassword(e.target.value)} />
                      <button className="field__iconBtn" type="button" aria-label={showPwd ? t('login.hidePwd', 'Hide password') : t('login.showPwd', 'Show password')} onClick={()=>setShowPwd(v=>!v)}>
                        <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{opacity: showPwd ? 0.7 : 1}}>
                          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </span>
                  </label>


                  {error && <div className="alert" role="alert" style={{color:'#f87171'}}>{error}</div>}
                  <button className="btn btn--primary btn--full" type="submit" disabled={loading}>{loading ? t('login.loggingIn', 'Logging in...') : t('common.login', 'Log In')}</button>

                  <div className="oauthRow">
                    <button className="btn btn--oauth btn--full" type="button" onClick={()=>{ window.location.href = '/oauth2/authorization/google' }} aria-label={t('login.continueGoogle', 'Continue with Google')}>
                      <span className="oauthIcon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21.35 11.1H12v2.9h5.35c-.25 1.6-1.8 4.7-5.35 4.7-3.22 0-5.85-2.66-5.85-5.9S8.78 6.9 12 6.9c1.84 0 3.07.78 3.77 1.45l2.57-2.48C16.85 4.45 14.62 3.5 12 3.5 6.98 3.5 2.9 7.58 2.9 12.6S6.98 21.7 12 21.7c6.98 0 8.1-6.1 7.8-10.6z" fill="currentColor"/>
                        </svg>
                      </span>
                      {t('login.continueGoogle', 'Continue with Google')}
                    </button>
                    <button className="btn btn--oauth btn--full" type="button" onClick={(e)=>e.preventDefault()} aria-label={t('login.continueApple', 'Continue with Apple')}>
                      <span className="oauthIcon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.67 17.23c-.33.76-.72 1.45-1.19 2.08-.63.85-1.15 1.43-1.55 1.74-.62.57-1.29.86-2.02.88-.52 0-1.15-.15-1.9-.45-.75-.3-1.44-.45-2.07-.45-.66 0-1.37.15-2.12.45-.75.3-1.35.46-1.79.47-.72.03-1.41-.28-2.08-.94-.44-.38-.98-1-1.62-1.87-.69-.95-1.26-2.06-1.69-3.32-.47-1.38-.71-2.72-.71-4.03 0-1.48.32-2.77.96-3.86.5-.86 1.16-1.55 1.99-2.07.83-.52 1.74-.79 2.72-.81.53 0 1.23.16 2.09.49.86.33 1.42.5 1.68.5.18 0 .78-.2 1.8-.59.97-.36 1.8-.51 2.49-.47 1.84.15 3.23.88 4.17 2.19-1.66 1.01-2.48 2.43-2.47 4.27.01 1.42.53 2.6 1.54 3.54.46.43.98.76 1.55.98-.12.36-.25.71-.4 1.04z"/>
                        </svg>
                      </span>
                      {t('login.continueApple', 'Continue with Apple (in the future)')}
                    </button>
                  </div>

                  <button className="link" type="button" onClick={()=>navigate('/register')}>{t('login.forgotPwd', 'Forgot password? (in the future)')}</button>
                </form>
              )}

              {activeTab === 'signup' && (
                <form className="authForm" action="#" onSubmit={async (e)=>{
                  e.preventDefault();
                  setError('');
                  setLoading(true);
                  try {
                    const res = await fetch('/api/v1/auth/register', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: signupName, email: signupEmail, password: signupPassword })
                    })
                    const data = await res.json().catch(()=>({}))
                    if (!res.ok) {
                      const msg = data?.error?.message || t('login.regError', 'Ошибка регистрации')
                      throw new Error(msg)
                    }
                    const token = data?.token
                    if (token) {
                      window.localStorage.setItem('pp-token', token)
                    }
                    navigate('/boards')
                  } catch (err) {
                    setError(err.message || t('login.requestError', 'Ошибка запроса'))
                  } finally {
                    setLoading(false)
                  }
                }}>
                  <label className="field">
                    <span className="field__label">{t('login.nameLabel', 'Name')}</span>
                    <span className="field__control">
                      <input className="input" type="text" placeholder={t('login.namePlaceholder', 'Your name')} autoComplete="name" required value={signupName} onChange={(e)=>setSignupName(e.target.value)} />
                    </span>
                  </label>
                  <label className="field">
                    <span className="field__label">{t('login.email', 'Email')}</span>
                    <span className="field__control">
                      <input className="input" type="email" placeholder={t('login.email', 'Email')} autoComplete="email" required value={signupEmail} onChange={(e)=>setSignupEmail(e.target.value)} />
                    </span>
                  </label>
                  <label className="field">
                    <span className="field__label">{t('login.password', 'Password')}</span>
                    <span className="field__control">
                      <input className="input" type="password" placeholder={t('login.password', 'Password')} autoComplete="new-password" required value={signupPassword} onChange={(e)=>setSignupPassword(e.target.value)} />
                    </span>
                  </label>

                  {error && <div className="alert" role="alert" style={{color:'#f87171'}}>{error}</div>}
                  <button className="btn btn--primary btn--full" type="submit" disabled={loading}>{loading ? t('login.signingUp', 'Signing up...') : t('login.signUpBtn', 'Sign Up')}</button>

                  <div className="oauthRow">
                    <button className="btn btn--oauth btn--full" type="button" onClick={()=>{ window.location.href = '/oauth2/authorization/google' }} aria-label={t('login.continueGoogle', 'Continue with Google')}>
                      <span className="oauthIcon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21.35 11.1H12v2.9h5.35c-.25 1.6-1.8 4.7-5.35 4.7-3.22 0-5.85-2.66-5.85-5.9S8.78 6.9 12 6.9c1.84 0 3.07.78 3.77 1.45l2.57-2.48C16.85 4.45 14.62 3.5 12 3.5 6.98 3.5 2.9 7.58 2.9 12.6S6.98 21.7 12 21.7c6.98 0 8.1-6.1 7.8-10.6z" fill="currentColor"/>
                        </svg>
                      </span>
                      {t('login.continueGoogle', 'Continue with Google')}
                    </button>
                    <button className="btn btn--oauth btn--full" type="button" onClick={(e)=>e.preventDefault()} aria-label={t('login.continueApple', 'Continue with Apple')}>
                      <span className="oauthIcon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.67 17.23c-.33.76-.72 1.45-1.19 2.08-.63.85-1.15 1.43-1.55 1.74-.62.57-1.29.86-2.02.88-.52 0-1.15-.15-1.9-.45-.75-.3-1.44-.45-2.07-.45-.66 0-1.37.15-2.12.45-.75.3-1.35.46-1.79.47-.72.03-1.41-.28-2.08-.94-.44-.38-.98-1-1.62-1.87-.69-.95-1.26-2.06-1.69-3.32-.47-1.38-.71-2.72-.71-4.03 0-1.48.32-2.77.96-3.86.5-.86 1.16-1.55 1.99-2.07.83-.52 1.74-.79 2.72-.81.53 0 1.23.16 2.09.49.86.33 1.42.5 1.68.5.18 0 .78-.2 1.8-.59.97-.36 1.8-.51 2.49-.47 1.84.15 3.23.88 4.17 2.19-1.66 1.01-2.48 2.43-2.47 4.27.01 1.42.53 2.6 1.54 3.54.46.43.98.76 1.55.98-.12.36-.25.71-.4 1.04z"/>
                        </svg>
                      </span>
                      {t('login.continueApple', 'Continue with Apple')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/*<div className="heroArt" aria-hidden="true">*/}
            {/*  <div className="heroArt__panel"></div>*/}
            {/*  <div className="heroArt__bubble heroArt__bubble--1"></div>*/}
            {/*  <div className="heroArt__bubble heroArt__bubble--2"></div>*/}
            {/*  <div className="heroArt__bubble heroArt__bubble--3"></div>*/}
            {/*</div>*/}
          </div>
        </section>
      </main>
    </div>
  )
}
