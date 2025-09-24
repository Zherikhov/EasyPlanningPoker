import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/apiBase'

const FIB = ['0','1','2','3','5','8','13','21','34']

export default function Estimate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'voting', task: null, participants: [], allowedValues: FIB, summary: null })
  const [error, setError] = useState('')
  const [selected, setSelected] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const logout = () => {
    try {
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
      if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || 'Ошибка загрузки состояния')
      const data = await res.json()
      setState(data)
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
        setError(j.message || 'Ошибка голосования')
      }
    } catch (e) { setError('Сеть недоступна') }
  }

  const reveal = async () => {
    try {
      const res = await fetch(apiUrl(`/api/boards/${id}/reveal`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) return logout()
      if (!res.ok) {
        setError((await res.json().catch(()=>({}))).message || 'Недостаточно прав')
      } else {
        // Ensure immediate UI update: load revealed state so votes show and button toggles to "Новый раунд"
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
        setError((await res.json().catch(()=>({}))).message || 'Недостаточно прав')
      } else {
        setSelected('')
        await loadState()
      }
    } catch {}
  }

  const summary = state.summary

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/boards/${id}`)} className="text-sm text-blue-600 hover:underline">← К доске</button>
          <h1 className="text-xl font-semibold">Оценка</h1>
        </div>
        <div className="space-x-2">
          {state.status === 'voting' && (
            <button onClick={reveal} className="text-sm bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded">Показать голоса</button>
          )}
          {state.status === 'revealed' && (
            <button onClick={() => newRound({})} className="text-sm bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded">Новый раунд</button>
          )}
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {error && <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-2 inline-block">{error}</div>}

        {/* Task block */}
        <div className="border rounded p-4 mb-4">
          <div className="text-sm text-gray-500">Задача</div>
          {state.task ? (
            <div>
              <div className="font-medium">{state.task.title} {state.task.key && <span className="text-gray-500 text-sm">({state.task.key})</span>}</div>
              {state.task.link && <a href={state.task.link} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Ссылка</a>}
              {state.task.description && <div className="text-sm text-gray-600 mt-1">{state.task.description}</div>}
            </div>
          ) : (
            <div className="text-gray-500">Задача не задана. Фасилитатор может начать новый раунд.</div>
          )}
        </div>

        {/* Cards */}
        <div className="mb-6">
          <div className="mb-2 text-sm text-gray-500">Выберите карточку</div>
          <div className="flex flex-wrap gap-2">
            {state.allowedValues.map(v => (
              <button key={v} disabled={state.status !== 'voting'} onClick={() => castVote(v)} className={`w-12 h-16 border rounded flex items-center justify-center text-lg ${selected===v? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div className="mb-6">
          <div className="mb-2 text-sm text-gray-500">Участники</div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {state.participants.map(p => (
              <li key={p.userId} className="border rounded p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">{p.initials || '?'}</div>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className={`text-xs ${p.status==='voted'?'text-green-600': p.status==='waiting'?'text-gray-500':'text-orange-500'}`}>{p.status==='voted'?'проголосовал': p.status==='waiting'?'ожидает':'оффлайн'}</div>
                  </div>
                </div>
                <div className="text-lg min-w-8 text-center">
                  {state.status === 'revealed' ? (p.vote ?? '—') : (p.voteMasked ?? '—')}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Status bar */}
        <div className="sticky bottom-4 bg-white/90 backdrop-blur border rounded p-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">Статус раунда: {state.status === 'voting' ? 'Голосование' : 'Раскрыто'}</div>
          <div className="text-sm">Ваш выбор: <span className="font-medium">{selected || '—'}</span></div>
        </div>

        {/* Results after reveal */}
        {state.status === 'revealed' && (
          <div className="mt-6">
            <div className="text-sm text-gray-500 mb-2">Сводка</div>
            {summary ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="border rounded p-3"><div className="text-xs text-gray-500">MIN</div><div className="text-xl">{summary.min}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-gray-500">MAX</div><div className="text-xl">{summary.max}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-gray-500">MEDIAN</div><div className="text-xl">{summary.median}</div></div>
                <div className="border rounded p-3"><div className="text-xs text-gray-500">MODE</div><div className="text-xl">{summary.mode}</div></div>
              </div>
            ) : (
              <div className="text-gray-500">Нет данных</div>
            )}
            {summary?.consensus && (
              <div className="mt-3 p-3 rounded bg-green-50 text-green-700 border border-green-200">Консенсус достигнут</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
