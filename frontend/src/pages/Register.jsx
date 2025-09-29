import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import '../styles/signin.css'
import { getSavedTheme, saveTheme, applyTheme } from '../lib/theme.js'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  // theme handling — same as on the Sign In page, but persist via shared util
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
      localStorage.setItem('signinTheme', theme)
    } catch {}
  }, [theme])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // basic client-side validation
    if (!email || !password || !name) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 8) {
      setError('Minimum password length is 8 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          displayName: name.trim(),
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const data = isJson ? await res.json() : null

      if (!res.ok) {
        if (res.status === 409) {
          setError(data?.message || 'Email is already registered')
        } else if (res.status === 400) {
          setError(data?.message || 'Please check the entered data')
        } else {
          setError(data?.message || 'Registration error')
        }
        return
      }

      // success
      setSuccess('Registration successful! You can now sign in.')
      // Optionally redirect to login after short delay
      setTimeout(() => navigate('/login'), 800)
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
        <h1>Sign Up</h1>
        {error && <div className="error-box">{error}</div>}
        {success && <div className="error-box" style={{color:'#065F46', background:'#D1FAE5', borderColor:'#6EE7B7'}}>{success}</div>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <div className="label">Name</div>
            <input
              id="name"
              type="text"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="field">
            <div className="label">Email</div>
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
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>

          <div className="meta">
            <div>
              Already have an account? <Link to="/login">Sign In</Link>
            </div>
          </div>

          <div className="sep">or</div>
          <button className="google" type="button">
            <img alt="G" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" />
            Sign up with Google
          </button>
        </form>
      </div>
    </div>
  )
}
