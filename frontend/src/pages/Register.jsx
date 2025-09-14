import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // basic client-side validation
    if (!email || !password || !name) {
      setError('Заполните все поля')
      return
    }
    if (password.length < 8) {
      setError('Минимальная длина пароля — 8 символов')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          displayName: name.trim(),
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const data = isJson ? await res.json() : null

      if (!res.ok) {
        if (res.status === 409) {
          setError(data?.message || 'Email уже зарегистрирован')
        } else if (res.status === 400) {
          setError(data?.message || 'Проверьте корректность введённых данных')
        } else {
          setError(data?.message || 'Ошибка регистрации')
        }
        return
      }

      // success
      setSuccess('Регистрация успешна! Теперь вы можете войти.')
      // Optionally redirect to login after short delay
      setTimeout(() => navigate('/login'), 800)
    } catch (err) {
      setError('Сетевая ошибка. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-center mb-6">Регистрация</h1>
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">{success}</div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="name">Имя</label>
            <input
              id="name"
              type="text"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
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
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60">
            {loading ? 'Отправка...' : 'Зарегистрироваться'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-blue-600 hover:underline">Авторизация</Link>
        </div>
      </div>
    </div>
  )
}
