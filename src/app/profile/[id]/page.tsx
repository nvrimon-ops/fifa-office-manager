import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computePlayerStats } from '@/lib/stats'
import type { Game } from '@/types/database'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('he-IL', {
    timeZone: 'Asia/Jerusalem',
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
    supabase.from('games').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*'),
  ])

  if (!profile) notFound()

  const allGames: Game[] = games ?? []
  const standings = computePlayerStats(allGames, allProfiles ?? [])
  const myStats = standings.find(s => s.profile.id === id)
  const rank = standings.filter(s => s.played > 0).findIndex(s => s.profile.id === id) + 1

  const myGames = allGames.filter(g =>
    g.team1_player1 === id || g.team1_player2 === id ||
    g.team2_player1 === id || g.team2_player2 === id
  )

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
  const gd = myStats ? myStats.goalsFor - myStats.goalsAgainst : 0

  // Last 5 results as W/D/L
  const last5 = myGames.slice(0, 5).map(game => {
    if (game.score_team1 === null || game.score_team2 === null) return null
    const onTeam1 = game.team1_player1 === id || game.team1_player2 === id
    const gf = onTeam1 ? game.score_team1 : game.score_team2
    const ga = onTeam1 ? game.score_team2 : game.score_team1
    return gf > ga ? 'W' : gf < ga ? 'L' : 'D'
  }).filter(Boolean) as ('W' | 'L' | 'D')[]

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

      {myStats && myStats.played > 0 ? (
        <>
          {/* Full stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="נקודות" value={myStats.points} color="text-[#00FF87]" />
            <StatCard label="משחקים" value={myStats.played} />
            <StatCard label="% ניצחון" value={`${winPct}%`} color="text-[#00FF87]" />
            <StatCard label="ניצחונות" value={myStats.wins} color="text-[#00FF87]" />
            <StatCard label="תיקו" value={myStats.draws} color="text-zinc-400" />
            <StatCard label="הפסדות" value={myStats.losses} color="text-red-400" />
            <StatCard label="שערים ל" value={myStats.goalsFor} />
            <StatCard label="שערים נגד" value={myStats.goalsAgainst} />
            <StatCard
              label="הפרש שערים"
              value={`${gd > 0 ? '+' : ''}${gd}`}
              color={gd >= 0 ? 'text-[#00FF87]' : 'text-red-400'}
            />
          </div>

          {/* Last 5 form */}
          {last5.length > 0 && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
              <h2 className="mb-3 font-semibold">5 המשחקים האחרונים</h2>
              <div className="flex gap-2">
                {last5.map((r, i) => (
                  <div
                    key={i}
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${
                      r === 'W' ? 'bg-[#00FF87]/20 text-[#00FF87]' :
                      r === 'L' ? 'bg-red-500/20 text-red-400' :
                      'bg-zinc-500/20 text-zinc-400'
                    }`}
                  >
                    {r === 'W' ? 'נ' : r === 'L' ? 'ה' : 'ת'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 text-center">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-zinc-400">לא שיחק עדיין</p>
        </div>
      )}

      {/* Full match history */}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="font-semibold">היסטוריית משחקים</h2>
        </div>
        {myGames.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">אין משחקים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                  <th className="px-4 py-2.5 text-right font-medium">תאריך</th>
                  <th className="px-4 py-2.5 text-right font-medium">יריב</th>
                  <th className="px-4 py-2.5 text-center font-medium">תוצאה</th>
                  <th className="px-4 py-2.5 text-center font-medium">פ׳</th>
                </tr>
              </thead>
              <tbody>
                {myGames.map(game => {
                  if (game.score_team1 === null || game.score_team2 === null) return null
                  const onTeam1 = game.team1_player1 === id || game.team1_player2 === id
                  const myScore = onTeam1 ? game.score_team1 : game.score_team2
                  const oppScore = onTeam1 ? game.score_team2 : game.score_team1
                  const result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'

                  const oppIds = onTeam1
                    ? [game.team2_player1, game.team2_player2]
                    : [game.team1_player1, game.team1_player2]
                  const oppNames = oppIds
                    .filter((p): p is string => p !== null)
                    .map(pid => profileMap.get(pid)?.nickname || profileMap.get(pid)?.full_name || '?')
                    .join(' + ')

                  return (
                    <tr key={game.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(game.created_at)}</td>
                      <td className="px-4 py-3 text-sm">{oppNames || '—'}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium">
                        {myScore} - {oppScore}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          result === 'W' ? 'bg-[#00FF87]/20 text-[#00FF87]' :
                          result === 'L' ? 'bg-red-500/20 text-red-400' :
                          'bg-zinc-500/20 text-zinc-400'
                        }`}>
                          {result === 'W' ? 'נ' : result === 'L' ? 'ה' : 'ת'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link href="/leaderboard" className="block text-center text-sm text-[#00FF87] hover:underline">
        ← לוח תוצאות מלא
      </Link>
    </div>
  )
}
