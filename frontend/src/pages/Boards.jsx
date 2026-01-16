import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Boards() {
  const navigate = useNavigate()

  const onLogout = () => {
    try {
      // Remove auth token (client-side logout)
      window.localStorage.removeItem('pp-token')
    } catch (_) {
      // ignore storage errors
    }
    // Redirect to login page
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-semibold">Добро пожаловать</h1>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Выйти
        </button>
      </div>
    </div>
  )
}
