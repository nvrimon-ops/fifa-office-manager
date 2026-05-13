import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/navbar'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FIFA Office Manager',
  description: 'נהל את משחקי ה-FIFA במשרד',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let upcomingCount = 0
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data

    const now = new Date().toISOString()
    const { data: futureSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('status', 'open')
      .gt('scheduled_time', now)
    const futureIds = (futureSessions ?? []).map(s => s.id)
    if (futureIds.length > 0) {
      const { count } = await supabase
        .from('session_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('cancelled_at', null)
        .in('session_id', futureIds)
      upcomingCount = count ?? 0
    }
  }

  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="min-h-full bg-[#0a0a0a] text-[#ededed] antialiased">
        {profile && <Navbar user={profile} upcomingCount={upcomingCount} />}
        <main className="mx-auto max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
