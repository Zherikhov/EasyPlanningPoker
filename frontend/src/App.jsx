import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Boards from './pages/Boards.jsx'
import Vote from './pages/Vote.jsx'
import Background from './components/Background.jsx'

export default function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const loadProfileAndSyncLang = async () => {
      const token = window.localStorage.getItem('pp-token')
      if (!token) return

      try {
        const res = await fetch('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const user = await res.json()
          if (user.defaultLocale && user.defaultLocale !== i18n.language) {
            i18n.changeLanguage(user.defaultLocale)
          }
        }
      } catch (e) {
        console.error('Failed to sync lang with profile', e)
      }
    }
    loadProfileAndSyncLang()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Устанавливаем класс темы на <html> при старте приложения,
  // чтобы на любых страницах фон и стили были консистентны
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('pp-theme') || 'dark'
    const html = document.documentElement
    html.classList.remove('theme-light', 'theme-dark')
    html.classList.add(`theme-${saved}`)
  }, [])

  return (
    <>
      <Background />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/boards" element={<Boards />} />
        <Route path="/boards/:boardId/vote" element={<Vote />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
