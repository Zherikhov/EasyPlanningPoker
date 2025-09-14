import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'

export default function BoardDetails() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
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

    const fetchBoard = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(apiUrl(`/api/boards/${id}`) , {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.status === 401) {
          logout()
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Не удалось загрузить доску')
        }
        const data = await res.json()
        setBoard(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <button onClick={() => navigate('/boards')} className="text-sm text-blue-600 hover:underline">← К списку досок</button>
        <button onClick={logout} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Выйти</button>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {loading && <div>Загрузка...</div>}
        {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block">{error}</div>}
        {!loading && !error && board && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">{board.name}</h1>
            <div className="space-y-2">
              <div><span className="text-gray-500">Описание:</span> {board.description || '—'}</div>
              <div><span className="text-gray-500">Создана:</span> {new Date(board.createdAt).toLocaleString()}</div>
              <div><span className="text-gray-500">ID:</span> {board.id}</div>
            </div>
            <div className="mt-4">
              <button onClick={() => navigate(`/boards/${board.id}/estimate`)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Перейти к оценке</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
