import type { Game, Profile } from '@/types/database'

export interface PlayerStats {
  profile: Profile
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export function computePlayerStats(games: Game[], profiles: Profile[]): PlayerStats[] {
  const statsMap = new Map<string, PlayerStats>()

  profiles.forEach(p => {
    statsMap.set(p.id, {
      profile: p,
      played: 0, wins: 0, draws: 0, losses: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0,
    })
  })

  games.forEach(game => {
    if (game.score_team1 === null || game.score_team2 === null) return
    const s1 = game.score_team1
    const s2 = game.score_team2
    const diff = Math.abs(s1 - s2)
    const t1pts = s1 > s2 ? (diff >= 3 ? 3 : 2) : 0
    const t2pts = s2 > s1 ? (diff >= 3 ? 3 : 2) : 0

    const update = (pids: string[], gf: number, ga: number, pts: number) => {
      pids.forEach(pid => {
        const s = statsMap.get(pid)
        if (!s) return
        s.played++
        s.goalsFor += gf
        s.goalsAgainst += ga
        s.points += pts
        if (gf > ga) s.wins++
        else if (gf === ga) s.draws++
        else s.losses++
      })
    }

    update([game.team1_player1, game.team1_player2].filter((p): p is string => p !== null), s1, s2, t1pts)
    update([game.team2_player1, game.team2_player2].filter((p): p is string => p !== null), s2, s1, t2pts)
  })

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
  })
}

export function computeBestPair(
  games: Game[],
  profiles: Profile[]
): { player1: Profile; player2: Profile; wins: number; played: number; winPct: number } | null {
  const pairMap = new Map<string, { wins: number; played: number; p1: string; p2: string }>()

  const record = (p1: string, p2: string, won: boolean) => {
    const key = [p1, p2].sort().join('|')
    if (!pairMap.has(key)) pairMap.set(key, { wins: 0, played: 0, p1, p2 })
    const s = pairMap.get(key)!
    s.played++
    if (won) s.wins++
  }

  games.forEach(game => {
    if (game.score_team1 === null || game.score_team2 === null) return
    const t1Won = game.score_team1 > game.score_team2
    const t2Won = game.score_team2 > game.score_team1
    if (game.team1_player2) record(game.team1_player1, game.team1_player2, t1Won)
    if (game.team2_player1 && game.team2_player2) record(game.team2_player1, game.team2_player2, t2Won)
  })

  const profileMap = new Map(profiles.map(p => [p.id, p]))
  let best: ReturnType<typeof computeBestPair> = null
  let bestScore = -1

  pairMap.forEach(stats => {
    if (stats.played < 2) return
    const winPct = stats.wins / stats.played
    const score = winPct * 10 + stats.played * 0.1
    if (score > bestScore) {
      const p1 = profileMap.get(stats.p1)
      const p2 = profileMap.get(stats.p2)
      if (p1 && p2) {
        bestScore = score
        best = { player1: p1, player2: p2, wins: stats.wins, played: stats.played, winPct }
      }
    }
  })

  return best
}

export function findLongestLosingStreak(
  games: Game[],
  profiles: Profile[]
): { profile: Profile; streak: number } | null {
  const sorted = [...games].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  let worst: { profile: Profile; streak: number } | null = null

  profiles.forEach(player => {
    const pg = sorted.filter(g =>
      g.team1_player1 === player.id || g.team1_player2 === player.id ||
      g.team2_player1 === player.id || g.team2_player2 === player.id
    )

    let streak = 0
    for (let i = pg.length - 1; i >= 0; i--) {
      const g = pg[i]
      if (g.score_team1 === null || g.score_team2 === null) break
      const onT1 = g.team1_player1 === player.id || g.team1_player2 === player.id
      const gf = onT1 ? g.score_team1 : g.score_team2
      const ga = onT1 ? g.score_team2 : g.score_team1
      if (gf < ga) streak++
      else break
    }

    if (streak > 0 && (!worst || streak > worst.streak)) {
      worst = { profile: player, streak }
    }
  })

  return worst
}
