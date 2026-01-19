import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Boards() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = window.localStorage.getItem('pp-token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    const load = async () => {
      try {
        const res = await fetch('/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        setProfile(data)
      } catch (e) {
        setError(e.message || 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [navigate])

  const onLogout = async () => {
    const token = window.localStorage.getItem('pp-token')
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
    } catch (_) { /* ignore */ }
    try { window.localStorage.removeItem('pp-token') } catch (_) {}
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-xl w-full">
        <h1 className="text-2xl font-semibold">Добро пожаловать</h1>
        {loading && (
          <p className="text-gray-600">Загрузка профиля...</p>
        )}
        {!loading && error && (
          <p className="text-red-600">{error}</p>
        )}
        {!loading && profile && (
          <div className="mx-auto w-full text-left bg-white/70 backdrop-blur shadow rounded-lg p-4 space-y-2">
            <div className="flex"><span className="w-40 text-gray-600">Имя:</span><span className="font-medium">{profile.displayName}</span></div>
            <div className="flex"><span className="w-40 text-gray-600">Почта:</span><span className="font-medium">{profile.email}</span></div>
            <div className="flex"><span className="w-40 text-gray-600">Дата регистрации:</span><span className="font-medium">{new Date(profile.createdAt).toLocaleString()}</span></div>
          </div>
        )}
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
