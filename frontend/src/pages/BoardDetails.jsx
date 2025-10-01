import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, applyTheme } from '../lib/theme.js'

export default function BoardDetails() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareEmail, setShareEmail] = useState('')
  const [shareMsg, setShareMsg] = useState('')
  const [sharing, setSharing] = useState(false)
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
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-semibold">{board.name}</h1>
              {board.shared && <span className="px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Shared</span>}
            </div>
            <div className="space-y-2">
              <div><span className="text-gray-500 dark:text-gray-400">Description:</span> {board.description || '—'}</div>
              <div><span className="text-gray-500 dark:text-gray-400">Created:</span> {new Date(board.createdAt).toLocaleString()}</div>
              <div><span className="text-gray-500 dark:text-gray-400">ID:</span> {board.id}</div>
            </div>
            <div className="mt-4 flex gap-3 items-center">
              <button onClick={() => navigate(`/boards/${board.id}/estimate`)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to estimation</button>
            </div>

            {/* Share form (only visible to owners in UX, but backend also validates) */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-4">
              <h2 className="text-lg font-medium mb-2">Share this board</h2>
              <div className="flex gap-2 items-center">
                <input type="email" value={shareEmail} onChange={(e)=>setShareEmail(e.target.value)} placeholder="user@example.com" className="flex-1 border rounded px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
                <button disabled={sharing || !shareEmail} onClick={async ()=>{
                  setShareMsg(''); setError(''); setSharing(true)
                  try {
                    const token = localStorage.getItem('accessToken')
                    const res = await fetch(apiUrl(`/api/boards/${id}/share`), { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ email: shareEmail }) })
                    if (res.status === 401) { logout(); return }
                    const data = await res.json().catch(()=>({}))
                    if (!res.ok) throw new Error(data.message || 'Failed to share')
                    setShareMsg('Invitation sent. If the user exists, the board is now shared.')
                    setShareEmail('')
                  } catch(e) {
                    setError(e.message || 'Failed to share')
                  } finally { setSharing(false) }
                }} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">{sharing? 'Sharing…' : 'Share'}</button>
              </div>
              {shareMsg && <div className="text-green-700 mt-2 dark:text-green-400">{shareMsg}</div>}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
