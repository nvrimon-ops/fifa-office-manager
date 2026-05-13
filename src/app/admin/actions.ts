'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('לא מחובר')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('אין הרשאה')
  return { supabase, adminClient: createAdminClient(), userId: user.id }
}

function revalidateAll() {
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/sessions')
  revalidatePath('/leaderboard')
}

export async function resetScores(): Promise<{ error?: string }> {
  try {
    const { adminClient } = await requireAdmin()
    const { error } = await adminClient.from('games').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return { error: error.message }
    revalidateAll()
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteHistory(): Promise<{ error?: string }> {
  try {
    const { adminClient } = await requireAdmin()
    const { data: finished, error: fetchErr } = await adminClient
      .from('sessions')
      .select('id')
      .eq('status', 'finished')
    if (fetchErr) return { error: fetchErr.message }
    const ids = (finished ?? []).map(s => s.id)
    if (ids.length > 0) {
      const { error: e1 } = await adminClient.from('trash_talk').delete().in('session_id', ids)
      if (e1) return { error: e1.message }
      const { error: e2 } = await adminClient.from('games').delete().in('session_id', ids)
      if (e2) return { error: e2.message }
      const { error: e3 } = await adminClient.from('session_registrations').delete().in('session_id', ids)
      if (e3) return { error: e3.message }
      const { error: e4 } = await adminClient.from('sessions').delete().in('id', ids)
      if (e4) return { error: e4.message }
    }
    revalidateAll()
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function newSeason(): Promise<{ error?: string }> {
  try {
    const { adminClient } = await requireAdmin()
    const placeholder = '00000000-0000-0000-0000-000000000000'
    const { error: e1 } = await adminClient.from('trash_talk').delete().neq('id', placeholder)
    if (e1) return { error: e1.message }
    const { error: e2 } = await adminClient.from('games').delete().neq('id', placeholder)
    if (e2) return { error: e2.message }
    const { error: e3 } = await adminClient.from('session_registrations').delete().neq('id', placeholder)
    if (e3) return { error: e3.message }
    const { error: e4 } = await adminClient.from('sessions').delete().neq('id', placeholder)
    if (e4) return { error: e4.message }
    revalidateAll()
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function updateGameScore(
  gameId: string,
  scoreTeam1: number,
  scoreTeam2: number,
): Promise<{ error?: string }> {
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .from('games')
      .update({ score_team1: scoreTeam1, score_team2: scoreTeam2 })
      .eq('id', gameId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath('/')
    revalidatePath('/leaderboard')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function setAdminStatus(targetUserId: string, isAdmin: boolean): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await requireAdmin()
    if (targetUserId === userId) return { error: 'לא ניתן לשנות הרשאות לעצמך' }
    const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', targetUserId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteUser(targetUserId: string): Promise<{ error?: string }> {
  try {
    const { supabase, userId } = await requireAdmin()
    if (targetUserId === userId) return { error: 'לא ניתן למחוק את עצמך' }
    const { error } = await supabase.from('profiles').delete().eq('id', targetUserId)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
