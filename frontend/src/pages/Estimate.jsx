import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'
import { getSavedTheme, applyTheme } from '../lib/theme.js'

const FIB = ['0','1','2','3','5','8','13','21','34']

export default function Estimate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'voting', task: null, participants: [], allowedValues: FIB, summary: null })
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [isFacilitator, setIsFacilitator] = useState(false)
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const allVoted = useMemo(() => {
    try {
      const arr = Array.isArray(state.participants) ? state.participants : []
      return arr.length > 0 && arr.every(p => p.status === 'voted')
    } catch { return false }
  }, [state.participants])

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

  const loadState = async () => {
    try {
      const res = await fetch(apiUrl(`/api/boards/${id}/state`), { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || 'Failed to load state')
      const data = await res.json()
      setState(data)
      try {
        const meRaw = localStorage.getItem('currentUser')
        const me = meRaw ? JSON.parse(meRaw) : null
        const myId = me?.id
        if (data && data.facilitatorId && myId) setIsFacilitator(String(data.facilitatorId) === String(myId))
        else setIsFacilitator(false)
      } catch { setIsFacilitator(false) }
    } catch (e) {
      setError(e.message)
    }
  }

  const join = async () => {
    try {
      const res = await fetch(apiUrl(`/api/boards/${id}/join`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
    } catch {}
  }

  useEffect(() => {
    // apply saved theme initially
    try {
      const saved = getSavedTheme()
      applyTheme(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    // detect owner by localStorage currentUser id equals board owner? we don't have it here, so enable reveal/reset based on server errors; for UI, allow buttons; server will enforce
    loadState()
    join()
    // subscribe SSE
    const es = new EventSource(apiUrl(`/api/boards/${id}/events?access_token=${encodeURIComponent(token||'')}`), { withCredentials: false })
    es.addEventListener('REVEALED', () => loadState())
    es.addEventListener('RESET', () => { setSelected(''); loadState() })
    es.addEventListener('ROUND_STARTED', () => { setSelected(''); loadState() })
    es.addEventListener('VOTE_CAST', () => loadState())
    es.addEventListener('USER_JOINED', () => loadState())
    es.addEventListener('USER_REMOVED', () => loadState())
    return () => { try { es.close() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const castVote = async (value) => {
    if (state.status !== 'voting') return
    setSelected(value)
    try {
      const res = await fetch(apiUrl(`/api/boards/${id}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value })
      })
      if (res.status === 401) return logout()
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        setError(j.message || 'Voting error')
      }
    } catch (e) { setError('Network unavailable') }
  }

  const reveal = async () => {
    try {
      const res = await fetch(apiUrl(`/api/boards/${id}/reveal`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
      if (!res.ok) {
        setError((await res.json().catch(()=>({}))).message || 'Insufficient permissions')
      } else {
        // Ensure immediate UI update: load revealed state so votes show and button toggles to "New round"
        await loadState()
      }
    } catch {}
  }


  const newRound = async (task) => {
    try {
      const res = await fetch(apiUrl(`/api/boards/${id}/round`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(task || {})
      })
      if (res.status === 401) return logout()
      if (!res.ok) {
        setError((await res.json().catch(()=>({}))).message || 'Insufficient permissions')
      } else {
        setSelected('')
        await loadState()
      }
    } catch {}
  }

  const removeParticipant = async (uid) => {
    try {
      // eslint-disable-next-line no-restricted-globals
      const ok = typeof window !== 'undefined' ? window.confirm('Remove this participant from the current session?') : true
      if (!ok) return
      const res = await fetch(apiUrl(`/api/boards/${id}/participants/${uid}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
      if (res.status === 403) {
        const j = await res.json().catch(()=>({}))
        setError(j.message || 'Only facilitator can remove participants')
        return
      }
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(()=>({}))
        setError(j.message || 'Failed to remove participant')
        return
      }
      await loadState()
    } catch (e) {
      setError('Network error')
    }
  }

  const summary = state.summary

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">

      <main className="p-6 max-w-5xl mx-auto">
        {error && <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block dark:bg-red-950/30 dark:text-red-300 dark:border-red-800">{error}</div>}

        {/* Task block */}
        <div className="border rounded p-4 mb-4 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Task</div>
          {state.task ? (
            <div>
              <div className="font-medium">{state.task.title} {state.task.key && <span className="text-gray-500 dark:text-gray-400 text-sm">({state.task.key})</span>}</div>
              {state.task.link && <a href={state.task.link} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Link</a>}
              {state.task.description && <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{state.task.description}</div>}
            </div>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">No task set. The facilitator can start a new round.</div>
          )}
        </div>

        {/* Cards */}
        <div className="mb-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Pick a card</div>
          <div className="flex flex-wrap gap-2">
            {state.allowedValues.map(v => (
              <button key={v} disabled={state.status !== 'voting'} onClick={() => castVote(v)} className={`w-12 h-16 border rounded flex items-center justify-center text-lg dark:border-gray-700 ${selected===v? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="mb-6">
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">Participants</div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.participants.map(p => (
              <li key={p.userId} className="border rounded p-3 flex items-center justify-between gap-3 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm">{p.initials || '?'}</div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className={`text-xs ${p.status==='voted'?'text-green-600': p.status==='waiting'?'text-gray-500 dark:text-gray-400':'text-orange-500'}`}>{p.status==='voted'?'voted': p.status==='waiting'?'waiting':'offline'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg min-w-8 text-center">
                    {(state.status === 'revealed' || allVoted) ? (p.vote ?? '—') : (p.voteMasked ?? '—')}
                  </div>
                  {isFacilitator && String(p.userId) !== String(state.facilitatorId) && (
                    <button title="Remove from session" onClick={() => removeParticipant(p.userId)} className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">✕</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions under participants */}
        <div className="mb-6 flex items-center gap-3">
          {state.status === 'voting' && (
            <button onClick={reveal} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Show votes
            </button>
          )}
          {state.status !== 'voting' && (
            <button onClick={() => newRound()} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600">
              New round
            </button>
          )}
        </div>

        {/* Status bar */}
        <div className="sticky bottom-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur border dark:border-gray-700 rounded p-3 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">Round status: {state.status === 'voting' ? 'Voting' : 'Revealed'}</div>
          <div className="text-sm">Your choice: <span className="font-medium">{selected || '—'}</span></div>
        </div>

        {/* Results after reveal */}
        {state.status === 'revealed' && (
          <div className="mt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Summary</div>
            {summary ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border rounded p-3 dark:border-gray-700"><div className="text-xs text-gray-500 dark:text-gray-400">MIN</div><div className="text-xl">{summary.min}</div></div>
                <div className="border rounded p-3 dark:border-gray-700"><div className="text-xs text-gray-500 dark:text-gray-400">MAX</div><div className="text-xl">{summary.max}</div></div>
                <div className="border rounded p-3 dark:border-gray-700"><div className="text-xs text-gray-500 dark:text-gray-400">MEDIAN</div><div className="text-xl">{summary.median}</div></div>
                <div className="border rounded p-3 dark:border-gray-700"><div className="text-xs text-gray-500 dark:text-gray-400">MODE</div><div className="text-xl">{summary.mode}</div></div>
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">No data</div>
            )}
            {summary?.consensus && (
              <div className="mt-3 p-3 rounded bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Consensus reached</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
