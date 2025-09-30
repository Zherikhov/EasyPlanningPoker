import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, applyTheme } from '../lib/theme.js'
import '../styles/profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  // Data
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // UI state matching demo
  const [avatarFile, setAvatarFile] = useState(null)

  // Form fields (demo-like)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')

  const avatarUrl = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile)
    return (user?.avatarUrl) || ''
  }, [avatarFile, user])

  useEffect(() => {
    // Apply saved theme
    try {
      const saved = getSavedTheme(); applyTheme(saved)
    } catch {}
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!token) { navigate('/login'); return }
      setLoading(true); setError('')
      try {
        const res = await fetch(apiUrl('/api/users/me'), { headers: { Authorization: `Bearer ${token}` } })
        if (res.status === 401) { navigate('/login'); return }
        if (!res.ok) {
          let msg = 'Failed to load profile'
          try { const err = await res.json(); if (err?.message) msg = err.message } catch {}
          throw new Error(msg)
        }
        const data = await res.json().catch(() => null)
        setUser(data)
        setFullName(data?.displayName || data?.username || '')
        setEmail(data?.email || '')
      } catch (e) {
        setError(e?.message || 'Failed to load profile')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const onChangeAvatar = (e) => {
    const f = e.target.files?.[0]; if (!f) return; setAvatarFile(f)
  }

  const onSave = (e) => {
    e.preventDefault()
    // Demo behavior: show success, no backend change implemented
    if (pwd && pwd !== pwd2) { alert('Passwords do not match'); return }
    alert('Profile saved')
  }

  if (loading) return <div className="page"><div className="meta">Loading...</div></div>
  if (error) return <div className="page"><div className="meta" style={{color:'#B91C1C'}}>{error}</div></div>
  if (!user) return <div className="page"><div className="meta">No data</div></div>

  return (
    <div className="profilePage">

      <main className="page">
        <section className="card grid">
          {/* Left pane */}
          <aside className="left">
            <div className="avatarWrap">
              {avatarUrl ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img className="avatar" alt="avatar" src={avatarUrl} onError={(e)=>{ e.currentTarget.style.display='none' }} />
              ) : (
                <div className="avatar" style={{display:'grid', placeItems:'center', background:'#EEF2FF', color:'#4F46E5', fontWeight:800}}>
                  {(fullName || user?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="name">{fullName || user?.username}</div>
              {!!email && <div className="email">{email}</div>}
              <input id="avatarInput" type="file" accept="image/*" hidden onChange={onChangeAvatar} />
              <button className="changeBtn" onClick={()=>document.getElementById('avatarInput').click()}>Change Avatar</button>
            </div>
          </aside>

          {/* Right pane */}
          <section className="right">
            <form onSubmit={onSave} id="profileForm">
              <div className="section">
                <label className="label" htmlFor="fullName">Full Name</label>
                <input id="fullName" className="input" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
              </div>
              <div className="section">
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" className="input" value={email} onChange={(e)=>setEmail(e.target.value)} />
              </div>
              <div className="row2 section" style={{marginTop:0}}>
                <div>
                  <label className="label" htmlFor="pwd">Password</label>
                  <input id="pwd" type="password" className="input" placeholder="••••••••" value={pwd} onChange={(e)=>setPwd(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="pwd2">Confirm Password</label>
                  <input id="pwd2" type="password" className="input" placeholder="••••••••" value={pwd2} onChange={(e)=>setPwd2(e.target.value)} />
                </div>
              </div>
              <button className="save">Save changes</button>
            </form>
          </section>
        </section>
      </main>
    </div>
  )
}
