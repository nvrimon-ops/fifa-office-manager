'use client'

import { useState, useTransition } from 'react'
import { registerForSession, cancelRegistration } from '@/app/sessions/actions'

interface Props {
  sessionId: string
  isRegistered: boolean
  canRegister: boolean
  canCancel: boolean
  isFull: boolean
}

export default function RegisterButton({ sessionId, isRegistered, canRegister, canCancel, isFull }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRegister() {
    setError(null)
    startTransition(async () => {
      const res = await registerForSession(sessionId)
      if (res?.error) setError(res.error)
    })
  }

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const res = await cancelRegistration(sessionId)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-1">
      {isRegistered ? (
        canCancel ? (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            {isPending ? '...' : 'ביטול'}
          </button>
        ) : (
          <span className="block text-center text-xs text-zinc-500">רשום ✓</span>
        )
      ) : canRegister && !isFull ? (
        <button
          onClick={handleRegister}
          disabled={isPending}
          className="w-full rounded-lg bg-[#00FF87] px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-[#00cc6a] disabled:opacity-50"
        >
          {isPending ? '...' : 'הירשם'}
        </button>
      ) : isFull ? (
        <span className="block text-center text-xs text-zinc-500">מלא</span>
      ) : null}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
