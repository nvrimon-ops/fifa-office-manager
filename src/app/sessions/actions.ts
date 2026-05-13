'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSession(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const scheduledTime = formData.get('scheduled_time') as string
  if (!scheduledTime) return { error: 'יש לבחור תאריך ושעה' }

  const { error } = await supabase.from('sessions').insert({
    created_by: user.id,
    scheduled_time: new Date(scheduledTime).toISOString(),
    status: 'open',
  })

  if (error) return { error: error.message }

  revalidatePath('/sessions')
  revalidatePath('/')
}

export async function registerForSession(sessionId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const now = new Date().toISOString()

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'open')
      .single()

    if (!session) return { error: 'הסשן לא זמין' }
    if (session.scheduled_time <= now) return { error: 'הסשן כבר עבר' }

    // Check already registered
    const { count: existingCount } = await supabase
      .from('session_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .is('cancelled_at', null)

    if ((existingCount ?? 0) > 0) return { error: 'כבר נרשמת לסשן זה' }

    // Check fair-play rule: max 2 future open sessions
    const { data: futureOpenSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('status', 'open')
      .gt('scheduled_time', now)

    const futureOpenIds = (futureOpenSessions ?? []).map(s => s.id)

    if (futureOpenIds.length > 0) {
      const { count: futureRegCount } = await supabase
        .from('session_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('cancelled_at', null)
        .in('session_id', futureOpenIds)

      if ((futureRegCount ?? 0) >= 2) return { error: 'לא ניתן להירשם ליותר מ-2 סשנים עתידיים' }
    }

    // Check spots available (max 4), excluding current user's own existing row
    const { count } = await supabase
      .from('session_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .is('cancelled_at', null)
      .neq('user_id', user.id)

    if ((count ?? 0) >= 4) return { error: 'הסשן מלא' }

    const { error } = await supabase
      .from('session_registrations')
      .upsert(
        { session_id: sessionId, user_id: user.id, slot_type: 'open', cancelled_at: null },
        { onConflict: 'session_id,user_id' }
      )

    if (error) return { error: error.message }

    revalidatePath('/sessions')
    revalidatePath('/')
  } catch {
    return { error: 'שגיאת שרת, נסה שוב בעוד רגע' }
  }
}

export async function cancelRegistration(sessionId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'לא מחובר' }

    const { data: session } = await supabase
      .from('sessions')
      .select('scheduled_time, status')
      .eq('id', sessionId)
      .single()

    if (!session) return { error: 'סשן לא נמצא' }
    if (session.status !== 'open') return { error: 'לא ניתן לבטל סשן שכבר התחיל' }

    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    if (session.scheduled_time <= fiveMinFromNow) return { error: 'לא ניתן לבטל פחות מ-5 דקות לפני הסשן' }

    const { error } = await supabase
      .from('session_registrations')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .is('cancelled_at', null)

    if (error) return { error: error.message }

    revalidatePath('/sessions')
    revalidatePath('/')
  } catch {
    return { error: 'שגיאת שרת, נסה שוב בעוד רגע' }
  }
}
