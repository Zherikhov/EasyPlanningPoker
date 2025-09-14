import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'

export default function Boards() {
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const logout = () => {
    try {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('expiresIn')
      localStorage.removeItem('currentUser')
    } catch {}
    navigate('/login')
  }

  const loadBoards = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/boards'), { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
      if (res.status === 204) {
        setBoards([])
        return
      }
      if (!res.ok) {
        // If backend returns not found or other non-OK, try to parse message; otherwise, for empty lists treat as []
        let msg = 'Не удалось загрузить доски'
        try {
          const err = await res.json()
          if (err && err.message) msg = err.message
        } catch (_) {
          // ignore parse error
        }
        throw new Error(msg)
      }
      let data = []
      try {
        data = await res.json()
      } catch (_) {
        data = []
      }
      if (!Array.isArray(data)) data = []
      setBoards(data)
    } catch (e) {
      // In case of network/CORS issues in dev, do not show error if we can't determine; fallback to empty list
      if (!e || !e.message) {
        setBoards([])
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    loadBoards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Название доски обязательно')
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/boards'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (res.status === 401) return logout()
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Не удалось создать доску')
      }
      const created = await res.json()
      setBoards((prev) => [created, ...prev])
      setIsModalOpen(false)
      setForm({ name: '', description: '' })
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Доски</h1>
        <div className="space-x-2">
          <button onClick={() => setIsModalOpen(true)} className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded">Создать новую доску</button>
          <button onClick={logout} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Выйти</button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading && <div>Загрузка...</div>}
        {error && <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block">{error}</div>}
        {!loading && !error && (
          boards.length ? (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((b) => (
                <li key={b.id} className="border rounded p-4 hover:shadow cursor-pointer" onClick={() => navigate(`/boards/${b.id}`)}>
                  <div className="font-medium mb-1">{b.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-2">{b.description || '—'}</div>
                  <div className="text-xs text-gray-400 mt-2">{new Date(b.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-600">У вас пока нет досок. Создайте первую.</div>
          )
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="font-medium">Новая доска</div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">✕</button>
            </div>
            <form onSubmit={onSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Название доски<span className="text-red-500">*</span></label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Например: Команда A" maxLength={200} required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Описание</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={4} maxLength={1000} placeholder="Необязательно" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded border">Отмена</button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                  {creating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
