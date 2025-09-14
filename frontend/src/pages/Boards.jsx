import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Boards() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const logout = () => {
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('expiresIn')
      localStorage.removeItem('currentUser')
    } catch {}
    navigate('/login')
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      navigate('/login')
      return
    }

    const fetchMe = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (res.status === 401) {
          logout()
          return
        }
        const data = await res.json()
        setUser(data)
      } catch (e) {
        setError('Не удалось загрузить профиль пользователя')
      } finally {
        setLoading(false)
      }
    }

    fetchMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Доски</h1>
        <button onClick={logout} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Выйти</button>
      </header>

      <main className="p-6">
        {loading && <div>Загрузка...</div>}
        {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block">{error}</div>}
        {!loading && !error && user && (
          <div className="max-w-xl">
            <h2 className="text-lg font-medium mb-3">Информация о пользователе</h2>
            <div className="overflow-hidden rounded border">
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">ID</div>
                <div className="col-span-2 break-all">{user.id}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Username</div>
                <div className="col-span-2">{user.username}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Email</div>
                <div className="col-span-2">{user.email}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Роль</div>
                <div className="col-span-2">{user.role}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Создан</div>
                <div className="col-span-2">{user.createdAt}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Обновлён</div>
                <div className="col-span-2">{user.updatedAt}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Профиль ID</div>
                <div className="col-span-2">{user.profileId || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Имя для отображения</div>
                <div className="col-span-2">{user.displayName || '—'}</div>
              </div>
              <div className="grid grid-cols-3 border-b p-3">
                <div className="text-gray-500">Avatar URL</div>
                <div className="col-span-2 break-all">{user.avatarUrl || '—'}</div>
              </div>
              <div className="grid grid-cols-3 p-3">
                <div className="text-gray-500">Bio</div>
                <div className="col-span-2">{user.bio || '—'}</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
