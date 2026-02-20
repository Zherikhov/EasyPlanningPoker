import React, { useEffect, useRef, useState } from 'react'

export default function ShareDialog({ open, onClose, boardId, boardName }) {
  const dialogRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [userIdInput, setUserIdInput] = useState('')
  const [emailRole, setEmailRole] = useState('MEMBER')
  const [userRole, setUserRole] = useState('MEMBER')
  const [emailRoleOpen, setEmailRoleOpen] = useState(false)
  const [userRoleOpen, setUserRoleOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)
  const emailRoleDdRef = useRef(null)
  const userRoleDdRef = useRef(null)
  const shareUrl = `${window.location.origin}/boards/${boardId}/vote`

  const roles = ['ADMIN', 'FACILITATOR', 'MEMBER', 'VIEWER']

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (emailRoleOpen && emailRoleDdRef.current && !emailRoleDdRef.current.contains(e.target)) {
        setEmailRoleOpen(false)
      }
      if (userRoleOpen && userRoleDdRef.current && !userRoleDdRef.current.contains(e.target)) {
        setUserRoleOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [emailRoleOpen, userRoleOpen])

  if (!open) return null

  const onBackdropClick = (e) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target)) {
      onClose?.()
    }
  }

  const handleInvite = async (type) => {
    setStatusMsg(null)
    const token = localStorage.getItem('pp-token')
    if (!token) {
      setStatusMsg({ type: 'error', text: 'You must be logged in' })
      return
    }

    const body = {}
    if (type === 'email') {
      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        setStatusMsg({ type: 'error', text: 'Email is required' })
        return
      }
      // Simple email validation
      if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
        setStatusMsg({ type: 'error', text: 'Invalid email format' })
        return
      }
      body.email = trimmedEmail
      body.role = emailRole
    } else {
      const trimmedUserId = userIdInput.trim()
      if (!trimmedUserId) {
        setStatusMsg({ type: 'error', text: 'User ID is required' })
        return
      }
      // UUID validation
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedUserId)) {
        setStatusMsg({ type: 'error', text: 'Invalid User ID format (UUID expected)' })
        return
      }
      body.userId = trimmedUserId
      body.role = userRole
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/boards/${boardId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to invite user')
      }

      setStatusMsg({ type: 'success', text: `Successfully invited ${type === 'email' ? body.email : body.userId}` })
      if (type === 'email') setEmail('')
      else setUserIdInput('')
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy!', err)
    }
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={onBackdropClick}>
      <div
        className="modal modal--share"
        role="dialog"
        aria-modal="true"
        aria-label="Share board"
        ref={dialogRef}
      >
        <div className="modal__head">
          <div className="modal__title">Share board</div>
          <button type="button" className="iconBtn" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal__body shareModal">
          <p className="shareModal__text">
            Invite others to <strong>{boardName || 'the board'}</strong> by sharing this link.
          </p>
          <div className="shareField">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="shareField__input"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className={`btn ${copied ? 'btn--success' : 'btn--primary'} shareField__btn`}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="shareInvite">
            <div className="shareInvite__title">Invite by email</div>
            <div className="shareInvite__row">
              <label className="field shareInvite__field">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </label>
              <div className="field shareInvite__role" ref={emailRoleDdRef}>
                <div className="langDropdown" style={{ width: '100%' }}>
                  <button
                    type="button"
                    className="langDropdown__button"
                    style={{ width: '100%', justifyContent: 'space-between', height: 42, borderRadius: 12 }}
                    aria-haspopup="listbox"
                    aria-expanded={emailRoleOpen}
                    onClick={() => setEmailRoleOpen(!emailRoleOpen)}
                    disabled={loading}
                    title="Select role"
                  >
                    {emailRole.charAt(0) + emailRole.slice(1).toLowerCase()}
                    <span className="langDropdown__chevron" aria-hidden="true">▾</span>
                  </button>
                  {emailRoleOpen && (
                    <ul className="langDropdown__menu" role="listbox" aria-label="Roles" style={{ width: '100%', top: 'calc(100% + 4px)' }}>
                      {roles.map((r) => (
                        <li
                          key={r}
                          role="option"
                          aria-selected={emailRole === r}
                          tabIndex={0}
                          className={`langDropdown__option ${emailRole === r ? 'is-selected' : ''}`}
                          onClick={() => { setEmailRole(r); setEmailRoleOpen(false); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setEmailRole(r); setEmailRoleOpen(false); } }}
                        >
                          {r.charAt(0) + r.slice(1).toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary shareInvite__btn"
                disabled={!email || loading}
                onClick={() => handleInvite('email')}
              >
                {loading ? '...' : 'Invite'}
              </button>
            </div>
          </div>

          <div className="shareInvite" style={{ marginTop: 16, paddingTop: 16 }}>
            <div className="shareInvite__title">Invite by User ID</div>
            <div className="shareInvite__row">
              <label className="field shareInvite__field">
                <input
                  type="text"
                  placeholder="Enter user UUID"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  disabled={loading}
                />
              </label>
              <div className="field shareInvite__role" ref={userRoleDdRef}>
                <div className="langDropdown" style={{ width: '100%' }}>
                  <button
                    type="button"
                    className="langDropdown__button"
                    style={{ width: '100%', justifyContent: 'space-between', height: 42, borderRadius: 12 }}
                    aria-haspopup="listbox"
                    aria-expanded={userRoleOpen}
                    onClick={() => setUserRoleOpen(!userRoleOpen)}
                    disabled={loading}
                    title="Select role"
                  >
                    {userRole.charAt(0) + userRole.slice(1).toLowerCase()}
                    <span className="langDropdown__chevron" aria-hidden="true">▾</span>
                  </button>
                  {userRoleOpen && (
                    <ul className="langDropdown__menu" role="listbox" aria-label="Roles" style={{ width: '100%', top: 'calc(100% + 4px)' }}>
                      {roles.map((r) => (
                        <li
                          key={r}
                          role="option"
                          aria-selected={userRole === r}
                          tabIndex={0}
                          className={`langDropdown__option ${userRole === r ? 'is-selected' : ''}`}
                          onClick={() => { setUserRole(r); setUserRoleOpen(false); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setUserRole(r); setUserRoleOpen(false); } }}
                        >
                          {r.charAt(0) + r.slice(1).toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary shareInvite__btn"
                disabled={!userIdInput || loading}
                onClick={() => handleInvite('userId')}
              >
                {loading ? '...' : 'Invite'}
              </button>
            </div>
          </div>

          {statusMsg && (
            <div className={`shareStatus shareStatus--${statusMsg.type}`}>
              {statusMsg.text}
            </div>
          )}

          <p className="shareModal__hint">
            Anyone with this link can join and participate in the voting.
          </p>
        </div>
      </div>
    </div>
  )
}
