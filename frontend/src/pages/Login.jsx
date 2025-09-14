import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { apiUrl } from '../lib/apiBase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Введите email и пароль')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, rememberMe }),
      })

      const contentType = res.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const data = isJson ? await res.json() : null

      if (!res.ok) {
        if (res.status === 401) {
          setError(data?.message || 'Неверный email или пароль')
        } else {
          setError(data?.message || 'Ошибка авторизации')
        }
        return
      }

      // success: save token and redirect
      const token = data?.accessToken
      if (token) {
        try {
          localStorage.setItem('accessToken', token)
          localStorage.setItem('expiresIn', String(data?.expiresIn ?? 3600))
          // optional: store minimal user info
          if (data?.user) localStorage.setItem('currentUser', JSON.stringify(data.user))
        } catch {}
      }

      navigate('/boards')
    } catch (err) {
      setError('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-center mb-6">Авторизация</h1>
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="flex items-center">
            <input id="remember" type="checkbox" className="mr-2" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={loading} />
            <label htmlFor="remember" className="text-sm">Запомнить меня</label>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60">{loading ? 'Входим...' : 'Войти'}</button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/register" className="text-blue-600 hover:underline">Регистрация</Link>
        </div>
      </div>
    </div>
  )
}
