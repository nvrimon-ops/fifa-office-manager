import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computePlayerStats, computeBestPair, findLongestLosingStreak } from '@/lib/stats'
import RealtimeRefresher from '@/components/realtime-refresher'

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-8 w-8 shrink-0 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: games }, { data: profiles }] = await Promise.all([
    supabase.from('games').select('*'),
    supabase.from('profiles').select('*'),
  ])

  const allGames = games ?? []
  const allProfiles = profiles ?? []

  const standings = computePlayerStats(allGames, allProfiles)
  const bestPair = computeBestPair(allGames, allProfiles)
  const loser = findLongestLosingStreak(allGames, allProfiles)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <>
      <RealtimeRefresher tables={['games']} />

      <div className="space-y-8">
        <h1 className="text-2xl font-bold">🏆 לוח תוצאות</h1>

        {/* Full standings table */}
        <section>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
            {standings.filter(s => s.played > 0).length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">אין נתונים עדיין — שחקו כמה משחקים!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                      <th className="px-4 py-3 text-right font-medium">#</th>
                      <th className="px-4 py-3 text-right font-medium">שחקן</th>
                      <th className="px-4 py-3 text-center font-medium">מש׳</th>
                      <th className="px-4 py-3 text-center font-medium">נצ׳</th>
                      <th className="px-4 py-3 text-center font-medium">תיקו</th>
                      <th className="px-4 py-3 text-center font-medium">הפסד</th>
                      <th className="px-4 py-3 text-center font-medium">שערים</th>
                      <th className="px-4 py-3 text-center font-medium font-bold text-[#00FF87]">נק׳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => {
                      const isMe = s.profile.id === user.id
                      const gd = s.goalsFor - s.goalsAgainst
                      return (
                        <tr
                          key={s.profile.id}
                          className={`border-b border-[#1a1a1a] last:border-0 transition-colors hover:bg-[#1a1a1a] ${isMe ? 'bg-[#00FF87]/5' : ''}`}
                        >
                          <td className="px-4 py-3 text-sm text-zinc-500">
                            {medals[i] ?? i + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/profile/${s.profile.id}`} className="flex items-center gap-2 hover:text-[#00FF87] transition-colors">
                              <Avatar name={s.profile.nickname || s.profile.full_name} />
                              <span className="text-sm font-medium">
                                {s.profile.nickname || s.profile.full_name}
                              </span>
                              {isMe && <span className="text-xs text-[#00FF87]">(אתה)</span>}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-zinc-400">{s.played}</td>
                          <td className="px-4 py-3 text-center text-sm text-[#00FF87]">{s.wins}</td>
                          <td className="px-4 py-3 text-center text-sm text-zinc-400">{s.draws}</td>
                          <td className="px-4 py-3 text-center text-sm text-red-400">{s.losses}</td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={gd >= 0 ? 'text-[#00FF87]' : 'text-red-400'}>
                              {gd > 0 ? '+' : ''}{gd}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-base font-bold text-[#00FF87]">{s.points}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Points legend */}
          <p className="mt-2 text-xs text-zinc-600">
            * ניצחון ב-3+ שערים הפרש = 3 נק׳ | ניצחון רגיל = 2 נק׳ | תיקו/הפסד = 0 נק׳
          </p>
        </section>

        {/* Special awards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best pair */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
            <h2 className="mb-4 font-semibold text-sm uppercase tracking-widest text-zinc-500">
              🤝 הזוג הכי חזק
            </h2>
            {bestPair ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${bestPair.player1.id}`} className="flex items-center gap-2 hover:text-[#00FF87] transition-colors">
                    <Avatar name={bestPair.player1.nickname || bestPair.player1.full_name} />
                    <span className="font-semibold">{bestPair.player1.nickname || bestPair.player1.full_name}</span>
                  </Link>
                  <span className="text-zinc-500 text-lg">+</span>
                  <Link href={`/profile/${bestPair.player2.id}`} className="flex items-center gap-2 hover:text-[#00FF87] transition-colors">
                    <Avatar name={bestPair.player2.nickname || bestPair.player2.full_name} />
                    <span className="font-semibold">{bestPair.player2.nickname || bestPair.player2.full_name}</span>
                  </Link>
                </div>
                <p className="text-sm text-zinc-400">
                  {bestPair.wins} ניצחונות מתוך {bestPair.played} משחקים
                  {' '}
                  <span className="text-[#00FF87] font-semibold">
                    ({Math.round(bestPair.winPct * 100)}%)
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">אין מספיק נתונים עדיין</p>
            )}
          </div>

          {/* Loser of the week */}
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5">
            <h2 className="mb-4 font-semibold text-sm uppercase tracking-widest text-zinc-500">
              💀 לוזר השבוע
            </h2>
            {loser ? (
              <div className="space-y-2">
                <Link href={`/profile/${loser.profile.id}`} className="flex items-center gap-3 hover:text-red-400 transition-colors">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 text-sm font-bold">
                    {(loser.profile.nickname || loser.profile.full_name).charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold">{loser.profile.nickname || loser.profile.full_name}</span>
                </Link>
                <p className="text-sm text-zinc-400">
                  רצף הפסדים: <span className="text-red-400 font-bold">{loser.streak} משחקים</span> ברציפות 😬
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">כולם מנצחים בשלב זה!</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
