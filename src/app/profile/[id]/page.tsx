import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computePlayerStats } from '@/lib/stats'
import type { Game } from '@/types/database'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  })
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  )
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: games }, { data: allProfiles }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('games').select('*'),
    supabase.from('profiles').select('*'),
  ])

  if (!profile) notFound()

  const allGames: Game[] = games ?? []
  const standings = computePlayerStats(allGames, allProfiles ?? [])
  const myStats = standings.find(s => s.profile.id === id)
  const rank = standings.filter(s => s.played > 0).findIndex(s => s.profile.id === id) + 1

  // Get player's games sorted by newest first
  const myGames = allGames
    .filter(g =>
      g.team1_player1 === id || g.team1_player2 === id ||
      g.team2_player1 === id || g.team2_player2 === id
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const profileMap = new Map((allProfiles ?? []).map(p => [p.id, p]))

  const rankBadge =
    rank === 1 ? { label: '🥇 מקום 1', color: 'text-amber-400 bg-amber-400/10' } :
    rank === 2 ? { label: '🥈 מקום 2', color: 'text-zinc-300 bg-zinc-300/10' } :
    rank === 3 ? { label: '🥉 מקום 3', color: 'text-amber-700 bg-amber-700/10' } :
    rank > 0 ? { label: `מקום ${rank}`, color: 'text-zinc-500 bg-zinc-500/10' } :
    null

  const isMe = user.id === id
  const winPct = myStats && myStats.played > 0
    ? Math.round((myStats.wins / myStats.played) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] text-2xl font-bold">
            {(profile.nickname || profile.full_name).charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {profile.nickname || profile.full_name}
              {isMe && <span className="mr-2 text-sm text-[#00FF87]">(אתה)</span>}
            </h1>
            {profile.nickname && (
              <p className="text-sm text-zinc-400">{profile.full_name}</p>
            )}
            {rankBadge && (
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${rankBadge.color}`}>
                {rankBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {myStats && myStats.played > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="נקודות" value={myStats.points} color="text-[#00FF87]" />
            <StatCard label="משחקים" value={myStats.played} />
            <StatCard label="אחוז ניצחון" value={`${winPct}%`} color="text-[#00FF87]" />
            <StatCard
              label="שערים"
              value={`${myStats.goalsFor > 0 ? '+' : ''}${myStats.goalsFor - myStats.goalsAgainst}`}
              color={myStats.goalsFor >= myStats.goalsAgainst ? 'text-[#00FF87]' : 'text-red-400'}
            />
          </div>

          {/* W/D/L breakdown */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
            <h2 className="mb-4 font-semibold">ביצועים</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#00FF87]">{myStats.wins}</p>
                <p className="text-xs text-zinc-500 mt-1">ניצחונות</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-zinc-400">{myStats.draws}</p>
                <p className="text-xs text-zinc-500 mt-1">תיקו</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{myStats.losses}</p>
                <p className="text-xs text-zinc-500 mt-1">הפסדות</p>
              </div>
            </div>

            {/* Bar chart */}
            {myStats.played > 0 && (
              <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
                <div
                  className="bg-[#00FF87]"
                  style={{ width: `${(myStats.wins / myStats.played) * 100}%` }}
                />
                <div
                  className="bg-zinc-500"
                  style={{ width: `${(myStats.draws / myStats.played) * 100}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(myStats.losses / myStats.played) * 100}%` }}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 text-center">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-zinc-400">לא שיחק עדיין</p>
        </div>
      )}

      {/* Last 5 games */}
      {myGames.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">5 המשחקים האחרונים</h2>
          <div className="space-y-2">
            {myGames.map(game => {
              if (game.score_team1 === null || game.score_team2 === null) return null

              const onTeam1 = game.team1_player1 === id || game.team1_player2 === id
              const myScore = onTeam1 ? game.score_team1 : game.score_team2
              const oppScore = onTeam1 ? game.score_team2 : game.score_team1
              const result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
              const resultColor = result === 'W' ? 'text-[#00FF87] bg-[#00FF87]/10' : result === 'L' ? 'text-red-400 bg-red-400/10' : 'text-zinc-400 bg-zinc-400/10'

              const myTeamIds = onTeam1
                ? [game.team1_player1, game.team1_player2]
                : [game.team2_player1, game.team2_player2]
              const oppTeamIds = onTeam1
                ? [game.team2_player1, game.team2_player2]
                : [game.team1_player1, game.team1_player2]

              const teammate = myTeamIds.filter((p): p is string => p !== null).find(pid => pid !== id)
              const teammateProfile = teammate ? profileMap.get(teammate) : null
              const oppNames = oppTeamIds.filter((p): p is string => p !== null).map(pid => profileMap.get(pid)?.nickname || profileMap.get(pid)?.full_name || '?')

              return (
                <div key={game.id} className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${resultColor}`}>
                    {result}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{myScore}</span>
                      <span className="text-zinc-500 mx-1">-</span>
                      <span className="font-medium">{oppScore}</span>
                      <span className="text-zinc-500 mx-2">נגד</span>
                      <span>{oppNames.join(' + ')}</span>
                    </p>
                    {teammateProfile && (
                      <p className="text-xs text-zinc-500">
                        עם {teammateProfile.nickname || teammateProfile.full_name}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 shrink-0">{formatDate(game.created_at)}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Link href="/leaderboard" className="block text-center text-sm text-[#00FF87] hover:underline">
        ← לוח תוצאות מלא
      </Link>
    </div>
  )
}
