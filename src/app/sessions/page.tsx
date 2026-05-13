'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createSession, registerForSession, cancelRegistration } from './actions'
import type { Profile, Session, SessionRegistration } from '@/types/database'

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'פתוח', color: 'text-[#00FF87] bg-[#00FF87]/10' },
  active: { label: 'פעיל', color: 'text-amber-400 bg-amber-400/10' },
  finished: { label: 'הסתיים', color: 'text-zinc-500 bg-zinc-500/10' },
}

interface SessionWithRegs extends Session {
  registrations: (SessionRegistration & { profile: Profile })[]
}

function canCancelReg(session: Session): boolean {
  const fiveMin = Date.now() + 5 * 60 * 1000
  return session.status === 'open' && new Date(session.scheduled_time).getTime() > fiveMin
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithRegs[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ [key: string]: string }>({})
  const [loadError, setLoadError] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function load() {
    setLoadError(false)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data: rawSessions, error: sessionsErr } = await supabase
        .from('sessions')
        .select('*')
        .order('scheduled_time', { ascending: true })

      if (sessionsErr) { setLoadError(true); return }
      if (!rawSessions) return

      const sessionIds = rawSessions.map(s => s.id)
      const { data: regsRaw } = await supabase
        .from('session_registrations')
        .select('*')
        .is('cancelled_at', null)
        .in('session_id', sessionIds)

      const allUserIds = [...new Set((regsRaw ?? []).map(r => r.user_id))]
      const { data: profilesData } = allUserIds.length > 0
        ? await supabase.from('profiles').select('*').in('id', allUserIds)
        : { data: [] as Profile[] }
      const profilesMap = new Map((profilesData ?? []).map(p => [p.id, p]))

      const regsBySession = new Map<string, (SessionRegistration & { profile: Profile })[]>()
      ;(regsRaw ?? []).forEach(r => {
        const prof = profilesMap.get(r.user_id)
        if (!prof) return
        const list = regsBySession.get(r.session_id) ?? []
        list.push({ ...r, profile: prof })
        regsBySession.set(r.session_id, list)
      })

      setSessions(rawSessions.map(s => ({
        ...s,
        registrations: (regsBySession.get(s.id) ?? []).sort(
          (a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
        ),
      })))
    } catch {
      setLoadError(true)
    }
  }

  useEffect(() => {
    load()
    const supabase = createClient()
    const channel = supabase
      .channel('sessions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_registrations' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRegister(sessionId: string) {
    startTransition(async () => {
      const res = await registerForSession(sessionId)
      if (res?.error) setActionError(prev => ({ ...prev, [sessionId]: res.error! }))
      else { setActionError(prev => { const n = { ...prev }; delete n[sessionId]; return n }); load() }
    })
  }

  function handleCancel(sessionId: string) {
    startTransition(async () => {
      const res = await cancelRegistration(sessionId)
      if (res?.error) setActionError(prev => ({ ...prev, [sessionId]: res.error! }))
      else { setActionError(prev => { const n = { ...prev }; delete n[sessionId]; return n }); load() }
    })
  }

  const futureOpenRegs = sessions.filter(
    s => s.status === 'open' && new Date(s.scheduled_time) > new Date() && s.registrations.some(r => r.user_id === userId)
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">סשנים</h1>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="rounded-xl bg-[#00FF87] px-4 py-2 text-sm font-bold text-black shadow-lg shadow-[#00FF87]/20 hover:bg-[#00cc6a] transition-colors"
        >
          {showCreate ? 'ביטול' : '+ פתח סשן חדש'}
        </button>
      </div>

      {showCreate && (
        <form
          action={async (fd) => {
            setCreateError(null)
            const res = await createSession(fd)
            if (res?.error) { setCreateError(res.error) }
            else { setShowCreate(false); load() }
          }}
          className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5 space-y-4"
        >
          <h2 className="font-semibold">סשן חדש</h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">תאריך ושעה</label>
            <input
              name="scheduled_time"
              type="datetime-local"
              required
              dir="ltr"
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white outline-none focus:border-[#00FF87]"
            />
          </div>
          {createError && (
            <p className="text-sm text-red-400">{createError}</p>
          )}
          <button
            type="submit"
            className="rounded-xl bg-[#00FF87] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#00cc6a] transition-colors"
          >
            פתח סשן
          </button>
        </form>
      )}

      {loadError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-12 text-center">
          <p className="text-red-400 mb-3">שגיאת שרת, נסה שוב בעוד רגע</p>
          <button
            onClick={load}
            className="rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
          >
            נסה שוב
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-zinc-400">אין סשנים עדיין</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const regs = session.registrations
            const isRegistered = userId ? regs.some(r => r.user_id === userId) : false
            const isFull = regs.length >= 4
            const canCancel = isRegistered && canCancelReg(session)
            const canRegister = !isRegistered && futureOpenRegs < 2 && session.status === 'open' && new Date(session.scheduled_time) > new Date()
            const statusInfo = STATUS_LABELS[session.status] ?? STATUS_LABELS.open
            const spots = 4 - regs.length

            return (
              <div
                key={session.id}
                className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-sm text-zinc-400">{formatDateTime(session.scheduled_time)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {regs.map(r => (
                        <div
                          key={r.id}
                          className="flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-2.5 py-1"
                        >
                          {r.slot_type === 'winner' && <span title="סלוט ניצחון">👑</span>}
                          <div className="h-5 w-5 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] text-[10px] font-bold">
                            {(r.profile.nickname || r.profile.full_name).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs">{r.profile.nickname || r.profile.full_name}</span>
                        </div>
                      ))}
                      {spots > 0 && session.status === 'open' && Array.from({ length: spots }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-dashed border-[#2a2a2a] px-3 py-1 text-xs text-zinc-600"
                        >
                          פנוי
                        </div>
                      ))}
                    </div>
                  </Link>

                  {session.status === 'open' && (
                    <div className="shrink-0 w-24">
                      {isRegistered ? (
                        canCancel ? (
                          <button
                            onClick={() => handleCancel(session.id)}
                            disabled={isPending}
                            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                          >
                            ביטול
                          </button>
                        ) : (
                          <span className="block text-center text-xs text-[#00FF87]">רשום ✓</span>
                        )
                      ) : canRegister ? (
                        <button
                          onClick={() => handleRegister(session.id)}
                          disabled={isPending}
                          className="w-full rounded-lg bg-[#00FF87] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#00cc6a] disabled:opacity-50 transition-colors"
                        >
                          הצטרף לסשן
                        </button>
                      ) : isFull ? (
                        <span className="block text-center text-xs text-amber-400">הסשן מלא</span>
                      ) : futureOpenRegs >= 2 ? (
                        <span className="block text-center text-xs text-zinc-500">לא ניתן להירשם ליותר מ-2 סשנים עתידיים</span>
                      ) : null}
                    </div>
                  )}
                </div>

                {actionError[session.id] && (
                  <p className="mt-2 text-xs text-red-400">{actionError[session.id]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
