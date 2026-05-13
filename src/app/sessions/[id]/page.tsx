import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TrashTalkClient from '@/components/trash-talk-client'
import ReportResultForm from '@/components/report-result-form'
import RealtimeRefresher from '@/components/realtime-refresher'
import RegisterButton from '@/components/register-button'
import RetryButton from '@/components/retry-button'
import { startSession } from './actions'
import type { Profile, Session, SessionRegistration, Game, TrashTalk } from '@/types/database'

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-10 w-10 shrink-0 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: 'פתוח', color: 'text-[#00FF87] bg-[#00FF87]/10' },
  active: { label: 'פעיל', color: 'text-amber-400 bg-amber-400/10' },
  finished: { label: 'הסתיים', color: 'text-zinc-500 bg-zinc-500/10' },
}

interface RegWithProfile extends SessionRegistration {
  profile: Profile
}

interface MsgWithProfile extends TrashTalk {
  profile: Profile
}

function PlayerCard({ reg, isWinnerSlot }: { reg: RegWithProfile | null; isWinnerSlot?: boolean }) {
  if (!reg) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#2a2a2a] px-4 py-3">
        <div className="h-10 w-10 rounded-full border border-dashed border-[#2a2a2a]" />
        <span className="text-sm text-zinc-600">מחכה לשחקן...</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3">
      {isWinnerSlot && <span className="text-sm" title="סלוט ניצחון">👑</span>}
      <Avatar name={reg.profile.nickname || reg.profile.full_name} />
      <Link href={`/profile/${reg.profile.id}`} className="text-sm font-medium hover:text-[#00FF87] transition-colors">
        {reg.profile.nickname || reg.profile.full_name}
      </Link>
    </div>
  )
}

function GameResult({ game, profilesMap }: { game: Game; profilesMap: Map<string, Profile> }) {
  const s1 = game.score_team1!
  const s2 = game.score_team2!
  const team1Won = s1 > s2
  const team2Won = s2 > s1
  const isDraw = s1 === s2

  const getName = (id: string | null) => {
    if (!id) return null
    const p = profilesMap.get(id)
    return p ? (p.nickname || p.full_name) : null
  }

  const t1names = [game.team1_player1, game.team1_player2].map(getName).filter(Boolean)
  const t2names = [game.team2_player1, game.team2_player2].map(getName).filter(Boolean)

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">קבוצה 1</p>
        <div className="space-y-1 mb-3">
          {t1names.map((name, i) => <p key={i} className="text-sm">{name}</p>)}
        </div>
        <div className={`text-5xl font-bold ${team1Won ? 'text-[#00FF87]' : 'text-zinc-400'}`}>{s1}</div>
        {team1Won && <p className="mt-1 text-xs text-[#00FF87]">🏆 ניצחון</p>}
      </div>

      <div className="text-center">
        {isDraw ? (
          <span className="text-lg font-bold text-zinc-500">תיקו</span>
        ) : (
          <span className="text-2xl font-bold text-zinc-600">-</span>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">קבוצה 2</p>
        <div className="space-y-1 mb-3">
          {t2names.map((name, i) => <p key={i} className="text-sm">{name}</p>)}
        </div>
        <div className={`text-5xl font-bold ${team2Won ? 'text-[#00FF87]' : 'text-zinc-400'}`}>{s2}</div>
        {team2Won && <p className="mt-1 text-xs text-[#00FF87]">🏆 ניצחון</p>}
      </div>
    </div>
  )
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  let session: Session | null = null
  let rawRegs: SessionRegistration[] | null = null
  let game: Game | null = null
  let rawMessages: TrashTalk[] | null = null
  let allProfilesData: Profile[] | null = null
  let currentProfile: { is_admin: boolean } | null = null
  let fetchError = false

  try {
    const results = await Promise.all([
      supabase.from('sessions').select('*').eq('id', id).single(),
      supabase
        .from('session_registrations')
        .select('*')
        .eq('session_id', id)
        .is('cancelled_at', null)
        .order('registered_at', { ascending: true }),
      supabase.from('games').select('*').eq('session_id', id).maybeSingle(),
      supabase
        .from('trash_talk')
        .select('*')
        .eq('session_id', id)
        .order('created_at', { ascending: true }),
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    ])
    session = results[0].data as Session | null
    rawRegs = results[1].data as SessionRegistration[] | null
    game = results[2].data as Game | null
    rawMessages = results[3].data as TrashTalk[] | null
    allProfilesData = results[4].data as Profile[] | null
    currentProfile = results[5].data as { is_admin: boolean } | null
    if (results[0].error || results[1].error) fetchError = true
  } catch {
    fetchError = true
  }

  if (fetchError && !session) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-red-400">שגיאת שרת, נסה שוב בעוד רגע</p>
        <RetryButton />
      </div>
    )
  }

  if (!session) notFound()

  const regsData: SessionRegistration[] = rawRegs ?? []
  const messagesData: TrashTalk[] = rawMessages ?? []
  const allProfiles: Profile[] = allProfilesData ?? []

  const profilesMap = new Map(allProfiles.map(p => [p.id, p]))

  const regs: RegWithProfile[] = regsData
    .filter(r => profilesMap.has(r.user_id))
    .map(r => ({ ...r, profile: profilesMap.get(r.user_id)! }))

  const messages: MsgWithProfile[] = messagesData
    .filter(m => profilesMap.has(m.user_id))
    .map(m => ({ ...m, profile: profilesMap.get(m.user_id)! }))

  const isAdmin = currentProfile?.is_admin === true
  const sessionData = session as Session
  const statusInfo = STATUS_LABELS[sessionData.status] ?? STATUS_LABELS.open

  const now = new Date()
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)
  const isRegistered = regs.some(r => r.user_id === user.id)
  const isFull = regs.length >= 4
  const canCancel = isRegistered && sessionData.status === 'open' && new Date(sessionData.scheduled_time) > fiveMinFromNow

  let futureOpenRegs = 0
  try {
    const { data: futureOpenSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('status', 'open')
      .gt('scheduled_time', now.toISOString())
    const futureIds = (futureOpenSessions ?? []).map(s => s.id)
    if (futureIds.length > 0) {
      const { count } = await supabase
        .from('session_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('cancelled_at', null)
        .in('session_id', futureIds)
      futureOpenRegs = count ?? 0
    }
  } catch { /* use 0 as fallback */ }

  const canRegister = !isRegistered && !isFull && sessionData.status === 'open' && new Date(sessionData.scheduled_time) > now && futureOpenRegs < 2

  return (
    <>
      <RealtimeRefresher tables={['sessions', 'session_registrations', 'games']} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/sessions" className="text-zinc-500 hover:text-white transition-colors">
            ← חזרה
          </Link>
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="text-sm text-zinc-400">{formatDateTime(sessionData.scheduled_time)}</span>
        </div>

        {/* Player slots */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
          <h2 className="mb-4 font-semibold">שחקנים</h2>
          {sessionData.status === 'active' || sessionData.status === 'finished' ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">קבוצה 1</p>
                <PlayerCard reg={regs[0] ?? null} isWinnerSlot={regs[0]?.slot_type === 'winner'} />
                <PlayerCard reg={regs[1] ?? null} isWinnerSlot={regs[1]?.slot_type === 'winner'} />
              </div>
              <span className="text-xl font-bold text-zinc-600">vs</span>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">קבוצה 2</p>
                <PlayerCard reg={regs[2] ?? null} isWinnerSlot={regs[2]?.slot_type === 'winner'} />
                <PlayerCard reg={regs[3] ?? null} isWinnerSlot={regs[3]?.slot_type === 'winner'} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map(i => (
                  <PlayerCard key={i} reg={regs[i] ?? null} isWinnerSlot={regs[i]?.slot_type === 'winner'} />
                ))}
              </div>
              <div className="mt-4">
                <RegisterButton
                  sessionId={id}
                  isRegistered={isRegistered}
                  canRegister={canRegister}
                  canCancel={canCancel}
                  isFull={isFull}
                />
              </div>
            </>
          )}
        </div>

        {/* Start game button */}
        {sessionData.status === 'open' && regs.length >= 2 && (
          <form
            action={async () => {
              'use server'
              await startSession(id)
            }}
          >
            <button
              type="submit"
              className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black shadow-lg shadow-amber-400/20 hover:bg-amber-300 transition-colors"
            >
              🎮 התחל משחק
            </button>
          </form>
        )}

        {/* Report result / game result */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
          <h2 className="mb-4 font-semibold">דיווח תוצאה</h2>
          {game && game.score_team1 !== null ? (
            <>
              <GameResult game={game as Game} profilesMap={profilesMap} />
              {isAdmin && (
                <div className="mt-6 border-t border-[#2a2a2a] pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">עריכת תוצאה (אדמין)</p>
                  <ReportResultForm sessionId={id} allProfiles={allProfiles} />
                </div>
              )}
            </>
          ) : (
            <ReportResultForm sessionId={id} allProfiles={allProfiles} />
          )}
        </div>

        {/* Trash talk */}
        <TrashTalkClient
          sessionId={id}
          currentUserId={user.id}
          initialMessages={messages}
        />
      </div>
    </>
  )
}
