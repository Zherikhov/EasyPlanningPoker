import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, applyTheme } from '../lib/theme.js'

export default function BoardDetails() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const logout = () => {
    try {
      // Persist current theme for auth pages before clearing user context
      const isDark = typeof document !== 'undefined' && document.documentElement?.classList?.contains('dark')
      localStorage.setItem('signinTheme', isDark ? 'dark' : 'light')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('expiresIn')
      localStorage.removeItem('currentUser')
    } catch {}
    navigate('/login')
  }

  useEffect(() => {
    try {
      const saved = getSavedTheme()
      applyTheme(saved)
    } catch {}

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
          throw new Error(data.message || 'Failed to load board')
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
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">

      <main className="p-6 max-w-3xl mx-auto">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">{error}</div>}
        {!loading && !error && board && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">{board.name}</h1>
            <div className="space-y-2">
              <div><span className="text-gray-500 dark:text-gray-400">Description:</span> {board.description || '—'}</div>
              <div><span className="text-gray-500 dark:text-gray-400">Created:</span> {new Date(board.createdAt).toLocaleString()}</div>
              <div><span className="text-gray-500 dark:text-gray-400">ID:</span> {board.id}</div>
            </div>
            <div className="mt-4">
              <button onClick={() => navigate(`/boards/${board.id}/estimate`)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to estimation</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
