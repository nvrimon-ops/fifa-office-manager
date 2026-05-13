'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

const NAV_LINKS = [
  { href: '/', label: 'דשבורד' },
  { href: '/sessions', label: 'סשנים' },
  { href: '/leaderboard', label: 'לוח תוצאות' },
]

function Avatar({ profile, size = 8 }: { profile: Pick<Profile, 'id' | 'nickname' | 'full_name' | 'avatar_url'>; size?: number }) {
  const initial = (profile.nickname || profile.full_name).charAt(0).toUpperCase()
  return (
    <div
      className={`h-${size} w-${size} shrink-0 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-[#00FF87] font-bold text-sm`}
    >
      {initial}
    </div>
  )
}

export default function Navbar({ user }: { user: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2a2a2a] bg-[#111111]/90 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="shrink-0 text-base font-bold">
            <span className="text-[#00FF87]">FIFA</span> Office Manager ⚽
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === l.href ? 'text-[#00FF87]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user.is_admin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors ${
                  pathname === '/admin' ? 'text-[#00FF87]' : 'text-zinc-400 hover:text-white'
                }`}
              >
                אדמין
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
              <Avatar profile={user} size={8} />
              <span className="hidden md:block text-sm font-medium">
                {user.nickname || user.full_name}
              </span>
            </Link>
            <button
              onClick={logout}
              className="hidden md:block text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              יציאה
            </button>
            <button
              className="md:hidden p-1 text-zinc-400 hover:text-white"
              onClick={() => setOpen(v => !v)}
              aria-label="תפריט"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-[#2a2a2a] py-3 space-y-1">
            {NAV_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === l.href
                    ? 'bg-[#00FF87]/10 text-[#00FF87]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user.is_admin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  pathname === '/admin'
                    ? 'bg-[#00FF87]/10 text-[#00FF87]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                אדמין
              </Link>
            )}
            <button
              onClick={logout}
              className="block w-full text-right rounded-lg px-3 py-2 text-sm text-red-400"
            >
              יציאה
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
