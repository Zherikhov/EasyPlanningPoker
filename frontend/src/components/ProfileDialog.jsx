import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ProfileDialog({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const dialogRef = useRef(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [langOpen, setLangOpen] = useState(false)
  const langDdRef = useRef(null)

  const currentLang = i18n.language || 'en'

  const tabs = [
    { id: 'basic', label: t('profile.tabs.basic', 'Basic Information') },
    { id: 'contacts', label: t('profile.tabs.contacts', 'Contacts') },
    { id: 'security', label: t('profile.tabs.security', 'Security') },
    { id: 'oauth', label: t('profile.tabs.oauth', 'Sign-in Accounts (OAuth)') },
    { id: 'deletion', label: t('profile.tabs.deletion', 'Account Deletion / Deactivation') },
  ]

  const changeLanguage = async (newLang) => {
    i18n.changeLanguage(newLang)
    setLangOpen(false)
    // Sync with backend
    try {
      const res = await fetch('/api/v1/users/me/locale', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.localStorage.getItem('pp-token')}`
        },
        body: JSON.stringify({ locale: newLang })
      })
      if (res.ok) {
        const updatedUser = await res.json()
        setProfile(updatedUser)
      }
    } catch (e) {
      console.error('Failed to sync locale with backend', e)
    }
  }

  useEffect(() => {
    if (!open) return
    if (profile) {
      setLoading(false)
      return
    }
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
  }, [open, profile])

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
    if (loading) return <div className="muted">{t('common.loading', 'Loading...')}</div>
    switch (activeTab) {
      case 'basic':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>{t('profile.basicInfo', 'Basic Information')}</h2>

            <div className="profileAvatarSection">
              <div className="profileAvatar">
                <span className="profileAvatar__fallback" aria-hidden={!!avatarUrl}>{userInitial}</span>
                {avatarUrl && (
                  <img src={avatarUrl} alt="" className="profileAvatar__img" onError={(e) => e.currentTarget.style.display = 'none'} />
                )}
              </div>
              <div className="profileAvatarInfo">
                <div style={{ fontWeight: 700, fontSize: 16 }}>{t('profile.picture', 'Profile picture')}</div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('profile.pictureDesc', 'A picture helps people recognize you.')}</div>
              </div>
            </div>

            <div className="profileFields">
              <label className="field">
                <span className="field__label">{t('profile.id', 'My ID')}</span>
                <input type="text" readOnly value={profile?.id || ''} className="input" />
              </label>

              <label className="field">
                <span className="field__label">{t('profile.displayName', 'Display name')}</span>
                <input type="text" readOnly value={userName} className="input" />
              </label>

              <div className="field">
                <span className="field__label">{t('user.locale', 'Language')}</span>
                <div className="langDropdown" ref={langDdRef} style={{ width: '100%' }}>
                  <button
                    type="button"
                    className="langDropdown__button"
                    style={{ width: '100%', justifyContent: 'space-between', height: 42, borderRadius: 12 }}
                    aria-haspopup="listbox"
                    aria-expanded={langOpen}
                    onClick={() => setLangOpen(!langOpen)}
                    title={t('user.selectLocale', 'Select language')}
                  >
                    {currentLang === 'en' ? 'English' : currentLang === 'ru' ? 'Русский' : currentLang === 'de' ? 'Deutsch' : currentLang}
                    <span className="langDropdown__chevron" aria-hidden="true">▾</span>
                  </button>
                  {langOpen && (
                    <ul className="langDropdown__menu" role="listbox" aria-label="Languages" style={{ width: '100%', top: 'calc(100% + 4px)' }}>
                      <li
                        role="option"
                        aria-selected={currentLang === 'en'}
                        tabIndex={0}
                        className={`langDropdown__option ${currentLang === 'en' ? 'is-selected' : ''}`}
                        onClick={() => changeLanguage('en')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { changeLanguage('en'); } }}
                      >
                        English
                      </li>
                      <li
                        role="option"
                        aria-selected={currentLang === 'ru'}
                        tabIndex={0}
                        className={`langDropdown__option ${currentLang === 'ru' ? 'is-selected' : ''}`}
                        onClick={() => changeLanguage('ru')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { changeLanguage('ru'); } }}
                      >
                        Русский
                      </li>
                      <li
                        role="option"
                        aria-selected={currentLang === 'de'}
                        tabIndex={0}
                        className={`langDropdown__option ${currentLang === 'de' ? 'is-selected' : ''}`}
                        onClick={() => changeLanguage('de')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { changeLanguage('de'); } }}
                      >
                        Deutsch
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              <label className="field">
                <span className="field__label">{t('profile.timezone', 'Timezone')}</span>
                <input type="text" readOnly value={profile?.timezone || 'UTC'} className="input" />
              </label>
            </div>
          </div>
        )
      case 'contacts':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>{t('profile.contacts', 'Contacts')}</h2>

            <div className="profileFields">
              <label className="field">
                <span className="field__label">{t('profile.email', 'My email')}</span>
                <input type="text" readOnly value={profile?.email || ''} className="input" />
              </label>
            </div>

          </div>
        )
      case 'security':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>{t('profile.security', 'Security')}</h2>
            <p className="muted">{t('profile.securityDesc', 'Update your password and security settings.')}</p>
          </div>
        )
      case 'oauth':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>{t('profile.oauth', 'Sign-in Accounts (OAuth)')}</h2>
            <p className="muted">{t('profile.oauthDesc', 'Connect your account with external providers.')}</p>
          </div>
        )
      case 'deletion':
        return (
          <div>
            <h2 className="modal__title" style={{ marginBottom: 16 }}>{t('profile.deletion', 'Account Deletion / Deactivation')}</h2>
            <p className="muted" style={{ marginBottom: 20 }}>{t('profile.deletionDesc', 'Permanently delete or temporarily deactivate your account.')}</p>
            <button className="btn btn--ghost" style={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.2)' }}>
              {t('profile.deactivateBtn', 'Deactivate Account')}
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
        aria-label={t('common.profile', 'Profile')}
        ref={dialogRef}
      >
        <div className="modal__head">
          <div className="modal__title">{t('profile.settingsTitle', 'Profile Settings')}</div>
          <button type="button" className="iconBtn" aria-label={t('common.close', 'Close')} onClick={onClose}>
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
