import React, { useEffect, useRef, useState } from 'react'

export default function BoardSettingsDialog({ open, onClose, boardId }) {
  const dialogRef = useRef(null)
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (!open || !boardId) return
    const token = window.localStorage.getItem('pp-token')
    if (!token) return

    const loadBoard = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/boards/${boardId}/details`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setBoard(data)
        }
      } catch (e) {
        console.error('Failed to load board details', e)
      } finally {
        setLoading(false)
      }
    }
    loadBoard()
  }, [open, boardId])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const onBackdropClick = (e) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target)) {
      onClose?.()
    }
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'tools', label: 'Tools' },
    { id: 'members', label: 'Members' },
    { id: 'links', label: 'Access Links' },
    { id: 'danger', label: 'Danger Zone' },
  ]

  const renderContent = () => {
    if (loading) return <div className="muted">Loading...</div>
    if (!board) return <div className="muted">Error loading board details.</div>

    switch (activeTab) {
      case 'general':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>General Information</h2>
            <div className="profileFields">
              <label className="field">
                <span className="field__label">Board Name</span>
                <input type="text" readOnly value={board.name} className="input" />
              </label>
              <label className="field">
                <span className="field__label">Description</span>
                <textarea 
                  readOnly 
                  value={board.description || 'No description'} 
                  className="input" 
                  style={{ minHeight: 80, padding: '10px 14px', resize: 'vertical' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <label className="field">
                  <span className="field__label">Key</span>
                  <input type="text" readOnly value={board.key} className="input" />
                </label>
                <label className="field">
                  <span className="field__label">Visibility</span>
                  <input type="text" readOnly value={board.visibility} className="input" />
                </label>
              </div>
              <label className="field">
                <span className="field__label">Created At</span>
                <input type="text" readOnly value={new Date(board.createdAt).toLocaleString()} className="input" />
              </label>
            </div>
          </div>
        )
      case 'tools':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Board Tools</h2>
            <p className="muted">Configure additional tools and integrations for this board.</p>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ 
                padding: '16px', 
                borderRadius: 12, 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Voting Deck</div>
                  <div className="muted" style={{ fontSize: 13 }}>Standard Fibonacci, T-Shirt, etc.</div>
                </div>
                <button className="btn btn--ghost" disabled style={{ fontSize: 12, height: 32 }}>Configure</button>
              </div>
              <div style={{ 
                padding: '16px', 
                borderRadius: 12, 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Integrations</div>
                  <div className="muted" style={{ fontSize: 13 }}>Connect Jira, Slack or Trello.</div>
                </div>
                <button className="btn btn--ghost" disabled style={{ fontSize: 12, height: 32 }}>Connect</button>
              </div>
            </div>
          </div>
        )
      case 'members':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Members ({board.members?.length || 0})</h2>
            <div className="membersList" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {board.members?.map((m, idx) => (
                <div key={idx} className="memberItem" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{m.userId}</span>
                    <span className="muted" style={{ fontSize: 12 }}>Joined: {new Date(m.joinedAt).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="metaPill" style={{ background: 'var(--brand-dim)', color: 'var(--brand-color)' }}>{m.role}</span>
                    <span className="metaPill">{m.status}</span>
                  </div>
                </div>
              ))}
              {(!board.members || board.members.length === 0) && <p className="muted">No members found.</p>}
            </div>
          </div>
        )
      case 'links':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Access Links</h2>
            <div className="linksList" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {board.accessLinks?.map((l, idx) => (
                <div key={idx} className="linkItem" style={{ 
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{l.label || 'Unnamed Link'}</span>
                    <span className="metaPill">{l.role}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Uses: {l.usesCount} / {l.maxUses || '∞'}
                  </div>
                </div>
              ))}
              {(!board.accessLinks || board.accessLinks.length === 0) && <p className="muted">No access links created.</p>}
            </div>
          </div>
        )
      case 'danger':
        return (
          <div className="profileBasic">
            <h2 className="modal__title" style={{ marginBottom: 16 }}>Danger Zone</h2>
            <p className="muted" style={{ marginBottom: 20 }}>Critical actions for this board. Be careful.</p>
            <button className="btn btn--ghost" style={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.2)' }}>
              Archive Board
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
        aria-label="Board Settings"
        ref={dialogRef}
      >
        <div className="modal__head">
          <div className="modal__title">Board Settings</div>
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
