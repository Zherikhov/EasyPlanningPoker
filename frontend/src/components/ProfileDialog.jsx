import React, { useEffect, useRef, useState } from 'react'

export default function ProfileDialog({ open, onClose }) {
  const dialogRef = useRef(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem('pp-lang') || 'en'
  })
  const [langOpen, setLangOpen] = useState(false)
  const langDdRef = useRef(null)

  const tabs = [
    { id: 'basic', label: 'Basic Information' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'security', label: 'Security' },
    { id: 'oauth', label: 'Sign-in Accounts (OAuth)' },
    { id: 'deletion', label: 'Account Deletion / Deactivation' },
  ]

  useEffect(() => {
    if (!open) return
    const token = window.localStorage.getItem('pp-token')
    if (!token) return

    const loadProfile = async () => {
      try {
        const res = await fetch('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (e) {
        console.error('Failed to load profile in dialog', e)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!langOpen) return
      if (langDdRef.current && !langDdRef.current.contains(e.target)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [langOpen])

  if (!open) return null

  const onBackdropClick = (e) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target)) {
      onClose?.()
    }
  }

  const userName = profile?.displayName || profile?.name || profile?.username || profile?.email || ''
  const userInitial = userName.trim().charAt(0).toUpperCase() || '?'
  const avatarUrl = profile?.avatarUrl || null

  const renderContent = () => {
    if (loading) return <div className="muted">Loading...</div>
    switch (activeTab) {
      case 'basic':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 24 }}>Basic Information</h2>

            <div className="profileAvatarSection">
              <div className="profileAvatar">
                <span className="profileAvatar__fallback" aria-hidden={!!avatarUrl}>{userInitial}</span>
                {avatarUrl && (
                  <img src={avatarUrl} alt="" className="profileAvatar__img" onError={(e) => e.currentTarget.style.display = 'none'} />
                )}
              </div>
              <div className="profileAvatarInfo">
                <div style={{ fontWeight: 700, fontSize: 16 }}>Profile picture</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>A picture helps people recognize you.</div>
              </div>
            </div>

            <div className="profileFields">
              <label className="field">
                <span className="field__label">Display name</span>
                <input type="text" readOnly value={userName} className="input" />
              </label>

              <div className="field">
                <span className="field__label">Language</span>
                <div className="langDropdown" ref={langDdRef} style={{ width: '100%' }}>
                  <button
                    type="button"
                    className="langDropdown__button"
                    style={{ width: '100%', justifyContent: 'space-between', height: 42, borderRadius: 12 }}
                    aria-haspopup="listbox"
                    aria-expanded={langOpen}
                    onClick={() => setLangOpen(!langOpen)}
                    title="Select language"
                  >
                    {lang === 'en' ? 'English' : lang}
                    <span className="langDropdown__chevron" aria-hidden="true">▾</span>
                  </button>
                  {langOpen && (
                    <ul className="langDropdown__menu" role="listbox" aria-label="Languages" style={{ width: '100%', top: 'calc(100% + 4px)' }}>
                      <li
                        role="option"
                        aria-selected={lang === 'en'}
                        tabIndex={0}
                        className={`langDropdown__option ${lang === 'en' ? 'is-selected' : ''}`}
                        onClick={() => { setLang('en'); setLangOpen(false); window.localStorage.setItem('pp-lang', 'en'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setLang('en'); setLangOpen(false); window.localStorage.setItem('pp-lang', 'en'); } }}
                      >
                        English
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              <label className="field">
                <span className="field__label">Timezone</span>
                <input type="text" readOnly value={profile?.timezone || 'UTC'} className="input" />
              </label>
            </div>
          </div>
        )
      case 'contacts':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Contacts</h2>
            <p className="muted">Manage your email addresses and contact methods.</p>
          </div>
        )
      case 'security':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Security</h2>
            <p className="muted">Update your password and security settings.</p>
          </div>
        )
      case 'oauth':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Sign-in Accounts (OAuth)</h2>
            <p className="muted">Connect your account with external providers.</p>
          </div>
        )
      case 'deletion':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Account Deletion / Deactivation</h2>
            <p className="muted" style={{ marginBottom: 20 }}>Permanently delete or temporarily deactivate your account.</p>
            <button className="btn btn--ghost" style={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.2)' }}>
              Deactivate Account
            </button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={onBackdropClick}>
      <div
        className="modal modal--profile"
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
        ref={dialogRef}
      >
        <div className="modal__head">
          <div className="modal__title">Profile Settings</div>
          <button type="button" className="iconBtn" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="profileTabs">
          <aside className="profileTabs__sidebar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`profileTabs__tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </aside>
          <div className="profileTabs__content">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
