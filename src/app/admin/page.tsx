import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computePlayerStats } from '@/lib/stats'
import AdminPanel from './admin-panel'
import type { Game, Profile } from '@/types/database'

function getName(p: Profile | undefined) {
  if (!p) return 'שחקן לא ידוע'
  return p.nickname || p.full_name
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!currentProfile?.is_admin) redirect('/')

  const [
    { data: gamesData },
    { data: profilesData },
    { data: sessionsData },
  ] = await Promise.all([
    supabase.from('games').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('sessions').select('id, status'),
  ])

  const allGames: Game[] = gamesData ?? []
  const allProfiles: Profile[] = profilesData ?? []
  const profileMap = new Map(allProfiles.map(p => [p.id, p]))

  const recentGames = allGames.slice(0, 20).map(g => ({
    id: g.id,
    score_team1: g.score_team1,
    score_team2: g.score_team2,
    created_at: g.created_at,
    team1_player1_name: getName(profileMap.get(g.team1_player1)),
    team1_player2_name: g.team1_player2 ? getName(profileMap.get(g.team1_player2)) : null,
    team2_player1_name: g.team2_player1 ? getName(profileMap.get(g.team2_player1)) : null,
    team2_player2_name: g.team2_player2 ? getName(profileMap.get(g.team2_player2)) : null,
  }))

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const thisWeekGames = allGames.filter(g => g.created_at >= weekAgo)
  const activityMap = new Map<string, number>()
  for (const g of thisWeekGames) {
    const players = [g.team1_player1, g.team1_player2, g.team2_player1, g.team2_player2]
      .filter((p): p is string => p !== null)
    for (const pid of players) activityMap.set(pid, (activityMap.get(pid) ?? 0) + 1)
  }
  let mostActiveId: string | null = null
  let maxCount = 0
  activityMap.forEach((count, id) => {
    if (count > maxCount) { maxCount = count; mostActiveId = id }
  })
  const mostActivePlayer = mostActiveId
    ? { name: getName(profileMap.get(mostActiveId)), games: maxCount }
    : null

  const playerStats = computePlayerStats(allGames, allProfiles).map(s => ({
    id: s.profile.id,
    name: getName(s.profile),
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    points: s.points,
  }))

  return (
    <AdminPanel
      currentUserId={user.id}
      recentGames={recentGames}
      profiles={allProfiles}
      totalGames={allGames.length}
      totalSessions={(sessionsData ?? []).length}
      mostActivePlayer={mostActivePlayer}
      playerStats={playerStats}
    />
  )
}
