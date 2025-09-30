import React from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'
import UserMenu from './UserMenu.jsx'

// Unified application header used on all non-auth pages
// Layout: logo at left, optional children in the middle (page-specific),
// right side: theme toggle and user menu (theme toggle is left of user menu)
export default function Header({ children }) {
  const navigate = useNavigate()
  return (
    <header className="app-header">
      <div className="app-header__left" onClick={() => navigate('/boards')} title="Home" style={{cursor:'pointer'}}>
        <div className="logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/>
            <path d="M8 12h8M12 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="brand-name">Easy Planning Poker</span>
      </div>

      <div className="app-header__center">
        {children}
      </div>

      <div className="app-header__right">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
