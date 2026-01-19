import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/demo-auth.css'

export default function Register() {
  const navigate = useNavigate()
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
        const msg = data?.error?.message || 'Ошибка регистрации'
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

  return (
    <div className="pp-root theme-dark" style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'18px'}}>
      <div className="authCard" role="region" aria-label="Registration">
        {/* Заголовок карточки (опционально) */}
        <div className="authTabs" aria-hidden="true" style={{borderBottom:'none', marginBottom:12}}>
          <button className="authTabs__tab is-active" style={{cursor:'default'}}>Sign Up</button>
        </div>
        <form className="authForm" onSubmit={onSubmit}>
          <label className="field">
            <span className="field__label">Name</span>
            <span className="field__control">
              <input className="input" type="text" placeholder="Your name" autoComplete="name" required value={name} onChange={(e)=>setName(e.target.value)} />
            </span>
          </label>
          <label className="field">
            <span className="field__label">Email</span>
            <span className="field__control">
              <input className="input" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
            </span>
          </label>
          <label className="field">
            <span className="field__label">Password</span>
            <span className="field__control">
              <input className="input" type="password" placeholder="Password" autoComplete="new-password" required value={password} onChange={(e)=>setPassword(e.target.value)} />
            </span>
          </label>

          {error && <div className="alert" role="alert" style={{color:'#f87171'}}>{error}</div>}
          <button className="btn btn--primary btn--full" type="submit" disabled={loading}>{loading ? 'Signing up...' : 'Sign Up'}</button>

          <div className="oauthRow">
            <button className="btn btn--oauth btn--full" type="button" onClick={()=>{ window.location.href = '/oauth2/authorization/google' }} aria-label="Continue with Google">
              <span className="oauthIcon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21.35 11.1H12v2.9h5.35c-.25 1.6-1.8 4.7-5.35 4.7-3.22 0-5.85-2.66-5.85-5.9S8.78 6.9 12 6.9c1.84 0 3.07.78 3.77 1.45l2.57-2.48C16.85 4.45 14.62 3.5 12 3.5 6.98 3.5 2.9 7.58 2.9 12.6S6.98 21.7 12 21.7c6.98 0 8.1-6.1 7.8-10.6z" fill="currentColor"/>
                </svg>
              </span>
              Continue with Google
            </button>
          </div>

          <button className="link" type="button" onClick={()=>navigate('/login')}>Already have an account? Log In</button>
        </form>
      </div>
    </div>
  )
}
