'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function startSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { count } = await supabase
    .from('session_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .is('cancelled_at', null)

  if ((count ?? 0) < 2) return { error: 'צריך לפחות 2 שחקנים כדי להתחיל' }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'active' })
    .eq('id', sessionId)
    .eq('status', 'open')

  if (error) return { error: error.message }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath('/sessions')
  revalidatePath('/')
}

export async function reportResult(sessionId: string, scoreTeam1: number, scoreTeam2: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { data: session } = await supabase
    .from('sessions')
    .select('status')
    .eq('id', sessionId)
    .single()

  if (!session || (session.status !== 'active' && session.status !== 'open')) return { error: 'הסשן לא זמין' }

  // Get registered players ordered by registration time
  const { data: regs } = await supabase
    .from('session_registrations')
    .select('user_id')
    .eq('session_id', sessionId)
    .is('cancelled_at', null)
    .order('registered_at', { ascending: true })
    .limit(4)

  if (!regs || regs.length < 2) return { error: 'לא מספיק שחקנים' }

  // Check game not already reported
  const { data: existingGame } = await supabase
    .from('games')
    .select('id')
    .eq('session_id', sessionId)
    .not('score_team1', 'is', null)
    .maybeSingle()

  if (existingGame) return { error: 'תוצאה כבר דווחה' }

  // Split players into two teams (ceiling split)
  const half = Math.ceil(regs.length / 2)
  const { error: gameErr } = await supabase.from('games').insert({
    session_id: sessionId,
    team1_player1: regs[0].user_id,
    team1_player2: half >= 2 ? (regs[1]?.user_id ?? null) : null,
    team2_player1: regs[half]?.user_id ?? null,
    team2_player2: regs[half + 1]?.user_id ?? null,
    score_team1: scoreTeam1,
    score_team2: scoreTeam2,
    reported_by: user.id,
  })

  if (gameErr) return { error: gameErr.message }

  const { error: sessionErr } = await supabase
    .from('sessions')
    .update({ status: 'finished' })
    .eq('id', sessionId)

  if (sessionErr) return { error: sessionErr.message }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath('/sessions')
  revalidatePath('/leaderboard')
  revalidatePath('/')
}

export async function reportResultWithPlayers(
  sessionId: string,
  team1Player1: string,
  team1Player2: string,
  team2Player1: string,
  team2Player2: string,
  scoreTeam1: number,
  scoreTeam2: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { data: existingGame } = await supabase
    .from('games')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (existingGame) return { error: 'תוצאה כבר דווחה' }

  const { error: gameErr } = await supabase.from('games').insert({
    session_id: sessionId,
    team1_player1: team1Player1,
    team1_player2: team1Player2 || null,
    team2_player1: team2Player1 || null,
    team2_player2: team2Player2 || null,
    score_team1: scoreTeam1,
    score_team2: scoreTeam2,
    reported_by: user.id,
  })

  if (gameErr) return { error: gameErr.message }

  const { error: sessionErr } = await supabase
    .from('sessions')
    .update({ status: 'finished' })
    .eq('id', sessionId)

  if (sessionErr) return { error: sessionErr.message }

  revalidatePath(`/sessions/${sessionId}`)
  revalidatePath('/sessions')
  revalidatePath('/leaderboard')
  revalidatePath('/')
}

export async function sendTrashTalk(sessionId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const trimmed = message.trim()
  if (!trimmed || trimmed.length > 280) return { error: 'הודעה לא תקינה' }

  const { error } = await supabase.from('trash_talk').insert({
    session_id: sessionId,
    user_id: user.id,
    message: trimmed,
  })

  if (error) return { error: error.message }

  revalidatePath(`/sessions/${sessionId}`)
}
