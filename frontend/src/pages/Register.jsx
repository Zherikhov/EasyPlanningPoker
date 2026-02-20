import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/demo-auth.css'

export default function Register() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.localStorage.getItem('pp-theme') || 'dark'
  })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
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
  }

  // Синхронизация класса темы на <html>, чтобы глобальный фон/стили были консистентными
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rootEl = document.documentElement
      rootEl.classList.remove('theme-light', 'theme-dark')
      rootEl.classList.add(`theme-${theme}`)
    }
  }, [theme])

  return (
    <div className={`pp-root theme-${theme}`} style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'18px'}}>
      <div className="authCard" role="region" aria-label={t('login.signUpTab', 'Sign Up')}>
        {/* Заголовок карточки (опционально) */}
        <div className="authTabs" aria-hidden="true" style={{borderBottom:'none', marginBottom:12}}>
          <button className="authTabs__tab is-active" style={{cursor:'default'}}>{t('login.signUpTab', 'Sign Up')}</button>
        </div>
        <form className="authForm" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">{t('login.nameLabel', 'Name')}</span>
            <span className="field__control">
              <input className="input" type="text" placeholder={t('login.namePlaceholder', 'Your name')} autoComplete="name" required value={name} onChange={(e)=>setName(e.target.value)} />
            </span>
          </label>
          <label className="field">
            <span className="field__label">{t('login.email', 'Email')}</span>
            <span className="field__control">
              <input className="input" type="email" placeholder={t('login.email', 'Email')} autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </span>
          </label>
          <label className="field">
            <span className="field__label">{t('login.password', 'Password')}</span>
            <span className="field__control">
              <input className="input" type="password" placeholder={t('login.password', 'Password')} autoComplete="new-password" required value={password} onChange={(e)=>setPassword(e.target.value)} />
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
          </div>

          <button className="link" type="button" onClick={()=>navigate('/login')}>{t('login.alreadyHaveAccount', 'Already have an account? Log In')}</button>
        </form>
      </div>
    </div>
  )
}
