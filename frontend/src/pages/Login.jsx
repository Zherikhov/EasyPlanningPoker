import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { apiUrl } from '../lib/apiBase'
import '../styles/signin.css'
import { getSavedTheme, saveTheme, applyTheme } from '../lib/theme.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [theme, setTheme] = useState('light')
  useEffect(() => {
    try {
      const saved = getSavedTheme()
      setTheme(saved)
      applyTheme(saved)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      saveTheme(theme)
      applyTheme(theme)
      // keep legacy key for signin page styling
      localStorage.setItem('signinTheme', theme)
    } catch {}
  }, [theme])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Enter email and password')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      })

      const contentType = res.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const data = isJson ? await res.json() : null

      if (!res.ok) {
        if (res.status === 401) {
          setError(data?.message || 'Invalid email or password')
        } else {
          setError(data?.message || 'Authentication error')
        }
        return
      }

      // success: save token and redirect
      const token = data?.accessToken
      if (token) {
        try {
          localStorage.setItem('accessToken', token)
          localStorage.setItem('expiresIn', String(data?.expiresIn ?? 3600))
          // optional: store minimal user info
          if (data?.user) localStorage.setItem('currentUser', JSON.stringify(data.user))
          // save theme under user-specific key now that we know the user
          saveTheme(theme)
        } catch {}
      }

      navigate('/boards')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`signin ${theme === 'light' ? 'light' : ''}`}>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      >
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
      <div className="card">
        <h1>Sign In</h1>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <div className="label">Email Address</div>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="field">
            <div className="label">Password</div>
            <input
              id="password"
              type={showPwd ? 'text' : 'password'}
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="showbtn"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? 'Hide password' : 'Show password'}
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="meta">
            <a href="#">Forgot password?</a>
            <div>
              No account? <Link to="/register">Sign up</Link>
            </div>
          </div>

          <div className="sep">or</div>
          <button className="google" type="button">
            <img alt="G" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  )
}
