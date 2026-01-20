import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Boards from './pages/Boards.jsx'
import Background from './components/Background.jsx'

export default function App() {
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
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
