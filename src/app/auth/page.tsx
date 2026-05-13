'use client'

import { useState, useActionState } from 'react'
import { login, register } from './actions'

type ActionState = { error?: string } | undefined

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-400">{message}</p>
}

export default function AuthPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loginState, loginAction, loginPending] = useActionState(login, undefined)
  const [registerState, registerAction, registerPending] = useActionState(register, undefined)

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="mb-8 text-center">
          <div className="mb-2 text-5xl">⚽</div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[#00FF87]">FIFA</span> Office Manager
          </h1>
          <p className="mt-1 text-sm text-zinc-400">מנהל משחקי FIFA במשרד</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-8 shadow-2xl shadow-black/60">
          {/* Tabs */}
          <div className="mb-6 flex rounded-xl bg-[#0a0a0a] p-1">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                tab === 'login'
                  ? 'bg-[#00FF87] text-black shadow-lg shadow-[#00FF87]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              כניסה
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                tab === 'register'
                  ? 'bg-[#00FF87] text-black shadow-lg shadow-[#00FF87]/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              הרשמה
            </button>
          </div>

          {/* Login Form */}
          {tab === 'login' && (
            <form action={loginAction} className="space-y-4">
              {loginState?.error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {loginState.error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  אימייל
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  dir="ltr"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  סיסמה
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
                />
              </div>

              <button
                type="submit"
                disabled={loginPending}
                className="mt-2 w-full rounded-xl bg-[#00FF87] py-3 text-sm font-bold text-black shadow-lg shadow-[#00FF87]/20 transition-all duration-200 hover:bg-[#00cc6a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginPending ? 'נכנס...' : 'כניסה'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form action={registerAction} className="space-y-4">
              {registerState?.error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {registerState.error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  שם מלא
                </label>
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  כינוי
                </label>
                <input
                  name="nickname"
                  type="text"
                  required
                  placeholder="FIFA King"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  אימייל
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  dir="ltr"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  סיסמה
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87]"
                />
              </div>

              <button
                type="submit"
                disabled={registerPending}
                className="mt-2 w-full rounded-xl bg-[#00FF87] py-3 text-sm font-bold text-black shadow-lg shadow-[#00FF87]/20 transition-all duration-200 hover:bg-[#00cc6a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {registerPending ? 'נרשם...' : 'הרשמה'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          FIFA Office Manager &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
