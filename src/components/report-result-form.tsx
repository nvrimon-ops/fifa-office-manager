'use client'

import { useState, useTransition } from 'react'
import { reportResultWithPlayers } from '@/app/sessions/[id]/actions'
import type { Profile } from '@/types/database'

interface Props {
  sessionId: string
  allProfiles: Profile[]
}

const selectClass =
  'w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-[#00FF87]'

export default function ReportResultForm({ sessionId, allProfiles }: Props) {
  const [t1p1, setT1p1] = useState('')
  const [t1p2, setT1p2] = useState('')
  const [t2p1, setT2p1] = useState('')
  const [t2p2, setT2p2] = useState('')
  const [score1, setScore1] = useState('')
  const [score2, setScore2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const s1 = parseInt(score1, 10)
    const s2 = parseInt(score2, 10)
    if (!t1p1 || !t2p1 || !score1 || !score2) {
      setError('כל השדות חובה')
      return
    }
    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      setError('כל השדות חובה')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await reportResultWithPlayers(sessionId, t1p1, t1p2, t2p1, t2p2, s1, s2)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-4">
        {/* Team 1 */}
        <div className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">קבוצה 1</p>
          <select value={t1p1} onChange={e => setT1p1(e.target.value)} className={selectClass}>
            <option value="">בחר שחקן 1</option>
            {allProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.nickname || p.full_name}</option>
            ))}
          </select>
          <select value={t1p2} onChange={e => setT1p2(e.target.value)} className={selectClass}>
            <option value="">בחר שחקן 2 (אופציונלי)</option>
            {allProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.nickname || p.full_name}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="99"
            value={score1}
            onChange={e => setScore1(e.target.value)}
            placeholder="0"
            dir="ltr"
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-center text-2xl font-bold text-[#00FF87] outline-none focus:border-[#00FF87]"
          />
        </div>

        <span className="mt-16 text-xl font-bold text-zinc-500">vs</span>

        {/* Team 2 */}
        <div className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">קבוצה 2</p>
          <select value={t2p1} onChange={e => setT2p1(e.target.value)} className={selectClass}>
            <option value="">בחר שחקן 1</option>
            {allProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.nickname || p.full_name}</option>
            ))}
          </select>
          <select value={t2p2} onChange={e => setT2p2(e.target.value)} className={selectClass}>
            <option value="">בחר שחקן 2 (אופציונלי)</option>
            {allProfiles.map(p => (
              <option key={p.id} value={p.id}>{p.nickname || p.full_name}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            max="99"
            value={score2}
            onChange={e => setScore2(e.target.value)}
            placeholder="0"
            dir="ltr"
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-center text-2xl font-bold text-[#00FF87] outline-none focus:border-[#00FF87]"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !t1p1 || !t2p1 || !score1 || !score2}
        className="w-full rounded-xl bg-[#00FF87] py-3 text-sm font-bold text-black shadow-lg shadow-[#00FF87]/20 transition-all hover:bg-[#00cc6a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'שומר...' : 'שמור תוצאה'}
      </button>
    </form>
  )
}
