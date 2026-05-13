import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computePlayerStats } from '@/lib/stats'
import RealtimeRefresher from '@/components/realtime-refresher'
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

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      className="rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] font-bold text-sm shrink-0"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function PlayerSlot({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#2a2a2a] px-3 py-2 text-sm text-zinc-600">
        <div className="h-7 w-7 rounded-full border border-dashed border-[#2a2a2a]" />
        מחכה לשחקן...
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
      <Avatar name={profile.nickname || profile.full_name} size={7} />
      <span className="text-sm font-medium">{profile.nickname || profile.full_name}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [
    { data: sessions },
    { data: games },
    { data: profiles },
    { data: registrations },
  ] = await Promise.all([
    supabase.from('sessions').select('*').order('scheduled_time', { ascending: true }),
    supabase.from('games').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('session_registrations').select('*').is('cancelled_at', null),
  ])

  const allSessions: Session[] = sessions ?? []
  const allGames = games ?? []
  const allProfiles: Profile[] = profiles ?? []
  const allRegs: SessionRegistration[] = registrations ?? []

  const profileMap = new Map(allProfiles.map(p => [p.id, p]))

  const activeSession = allSessions.find(s => s.status === 'active') ?? null
  const upcomingSessions = allSessions.filter(s => s.status === 'open').slice(0, 5)

  const activeRegs = activeSession
    ? allRegs.filter(r => r.session_id === activeSession.id).sort(
        (a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
      )
    : []

  const topPlayers = computePlayerStats(allGames, allProfiles)
    .filter(s => s.played > 0)
    .slice(0, 5)

  const upcomingWithRegs = upcomingSessions.map(s => ({
    session: s,
    regs: allRegs.filter(r => r.session_id === s.id),
  }))

  return (
    <>
      <RealtimeRefresher tables={['sessions', 'session_registrations', 'games']} />

      <div className="space-y-8">
        <h1 className="text-2xl font-bold">
          שלום, <span className="text-[#00FF87]">{profileMap.get(user.id)?.nickname ?? 'שחקן'}</span> ⚽
        </h1>

        {/* Active session */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">🟢 מי על המגרש עכשיו</h2>
          {activeSession ? (
            <Link href={`/sessions/${activeSession.id}`}>
              <div className="rounded-2xl border border-[#00FF87]/30 bg-[#111111] p-5 shadow-lg shadow-[#00FF87]/5 transition-colors hover:border-[#00FF87]/50">
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00FF87]/10 px-3 py-1 text-xs font-semibold text-[#00FF87]">
                    <span className="h-2 w-2 rounded-full bg-[#00FF87] animate-pulse" />
                    משחק פעיל
                  </span>
                  <span className="text-xs text-zinc-500">{formatDateTime(activeSession.scheduled_time)}</span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="space-y-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">קבוצה 1</p>
                    <PlayerSlot profile={activeRegs[0] ? profileMap.get(activeRegs[0].user_id) ?? null : null} />
                    <PlayerSlot profile={activeRegs[1] ? profileMap.get(activeRegs[1].user_id) ?? null : null} />
                  </div>
                  <span className="text-2xl font-bold text-zinc-600">vs</span>
                  <div className="space-y-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">קבוצה 2</p>
                    <PlayerSlot profile={activeRegs[2] ? profileMap.get(activeRegs[2].user_id) ?? null : null} />
                    <PlayerSlot profile={activeRegs[3] ? profileMap.get(activeRegs[3].user_id) ?? null : null} />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 text-center">
              <p className="text-4xl mb-3">😴</p>
              <p className="text-zinc-400">אין משחק פעיל כרגע</p>
              <Link href="/sessions" className="mt-3 inline-block text-sm text-[#00FF87] hover:underline">
                לראות את הסשנים הבאים →
              </Link>
            </div>
          )}
        </section>

        {/* Upcoming sessions */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">📅 הבאים בתור</h2>
            <Link href="/sessions" className="text-sm text-[#00FF87] hover:underline">
              כל הסשנים →
            </Link>
          </div>

          {upcomingWithRegs.length === 0 ? (
            <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-6 text-center text-sm text-zinc-500">
              אין סשנים מתוכננים
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingWithRegs.map(({ session, regs }) => {
                const spots = 4 - regs.length
                return (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="flex items-center justify-between rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 transition-colors hover:border-[#3a3a3a]">
                      <div>
                        <p className="text-sm font-medium">{formatDateTime(session.scheduled_time)}</p>
                        <div className="mt-1 flex items-center gap-1">
                          {regs.map(r => {
                            const p = profileMap.get(r.user_id)
                            return p ? (
                              <div
                                key={r.id}
                                title={p.nickname || p.full_name}
                                className="h-5 w-5 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] text-[10px] font-bold"
                              >
                                {(p.nickname || p.full_name).charAt(0).toUpperCase()}
                              </div>
                            ) : null
                          })}
                          {spots > 0 && (
                            <span className="text-xs text-zinc-500 mr-1">{spots} מקומות פנויים</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold ${spots === 0 ? 'text-amber-400' : 'text-[#00FF87]'}`}>
                          {regs.length}/4
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Leaderboard preview */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">🏆 טייבל</h2>
            <Link href="/leaderboard" className="text-sm text-[#00FF87] hover:underline">
              טבלה מלאה →
            </Link>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
            {topPlayers.length === 0 ? (
              <p className="p-6 text-center text-sm text-zinc-500">אין נתונים עדיין</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                    <th className="px-4 py-2.5 text-right font-medium">#</th>
                    <th className="px-4 py-2.5 text-right font-medium">שחקן</th>
                    <th className="px-4 py-2.5 text-center font-medium">מש׳</th>
                    <th className="px-4 py-2.5 text-center font-medium">נק׳</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((s, i) => {
                    const isMe = s.profile.id === user.id
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <tr
                        key={s.profile.id}
                        className={`border-b border-[#1a1a1a] last:border-0 ${isMe ? 'bg-[#00FF87]/5' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {medals[i] ?? <span>{i + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/profile/${s.profile.id}`} className="flex items-center gap-2 hover:text-[#00FF87] transition-colors">
                            <Avatar name={s.profile.nickname || s.profile.full_name} size={7} />
                            <span className="text-sm font-medium">
                              {s.profile.nickname || s.profile.full_name}
                              {isMe && <span className="mr-1 text-xs text-[#00FF87]">(אתה)</span>}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-400">{s.played}</td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-[#00FF87]">{s.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
