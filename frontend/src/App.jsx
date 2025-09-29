import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Boards from './pages/Boards.jsx'
import BoardDetails from './pages/BoardDetails.jsx'
import Estimate from './pages/Estimate.jsx'
import { getSavedTheme, applyTheme } from './lib/theme.js'

export default function App() {
  useEffect(() => {
    // Apply saved theme on app load
    try {
      applyTheme(getSavedTheme())
    } catch {}

    // Sync theme across tabs
    const onStorage = (e) => {
      if (e.key && e.key.startsWith('theme:')) {
        try { applyTheme(getSavedTheme()) } catch {}
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/boards" element={<Boards />} />
      <Route path="/boards/:id" element={<BoardDetails />} />
      <Route path="/boards/:id/estimate" element={<Estimate />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
