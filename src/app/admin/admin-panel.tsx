'use client'

import { useState, useTransition, useCallback, useRef } from 'react'
import {
  resetScores,
  deleteHistory,
  newSeason,
  updateGameScore,
  setAdminStatus,
  deleteUser,
} from './actions'
import type { Profile } from '@/types/database'

type GameRow = {
  id: string
  score_team1: number | null
  score_team2: number | null
  created_at: string
  team1_player1_name: string
  team1_player2_name: string | null
  team2_player1_name: string | null
  team2_player2_name: string | null
}

type StatRow = {
  id: string
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

interface Props {
  currentUserId: string
  recentGames: GameRow[]
  profiles: Profile[]
  totalGames: number
  totalSessions: number
  mostActivePlayer: { name: string; games: number } | null
  playerStats: StatRow[]
}

type ToastMsg = { id: number; message: string; type: 'success' | 'error' }

let _toastId = 0

// ─── Confirm dialog ───────────────────────────────────────────────────────────

type ConfirmState = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  dangerous: boolean
  onConfirm: () => void
}

const CONFIRM_CLOSED: ConfirmState = {
  open: false, title: '', message: '', confirmLabel: 'אישור', dangerous: false, onConfirm: () => {},
}

function ConfirmDialog({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state.open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6 shadow-2xl w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-2">{state.title}</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{state.message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#2a2a2a] py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={state.onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              state.dangerous
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#00FF87] hover:bg-[#00cc6a] text-black'
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit score modal ─────────────────────────────────────────────────────────

function EditModal({
  game,
  onClose,
  onSave,
  isPending,
}: {
  game: GameRow
  onClose: () => void
  onSave: (s1: number, s2: number) => void
  isPending: boolean
}) {
  const [s1, setS1] = useState(String(game.score_team1 ?? 0))
  const [s2, setS2] = useState(String(game.score_team2 ?? 0))

  function handleSave() {
    const n1 = parseInt(s1, 10)
    const n2 = parseInt(s2, 10)
    if (isNaN(n1) || isNaN(n2) || n1 < 0 || n2 < 0) return
    onSave(n1, n2)
  }

  const team1 = [game.team1_player1_name, game.team1_player2_name].filter(Boolean).join(' + ')
  const team2 = [game.team2_player1_name, game.team2_player2_name].filter(Boolean).join(' + ')

  const scoreInput = 'w-16 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-2 text-center text-xl font-bold text-[#00FF87] outline-none focus:border-[#00FF87]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6 shadow-2xl w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold mb-4">ערוך תוצאה</h3>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 text-center">
            <p className="text-xs text-zinc-500 mb-2 truncate">{team1}</p>
            <input dir="ltr" type="number" min="0" max="99" value={s1} onChange={e => setS1(e.target.value)} className={scoreInput} />
          </div>
          <span className="text-lg font-bold text-zinc-500">-</span>
          <div className="flex-1 text-center">
            <p className="text-xs text-zinc-500 mb-2 truncate">{team2}</p>
            <input dir="ltr" type="number" min="0" max="99" value={s2} onChange={e => setS2(e.target.value)} className={scoreInput} />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#2a2a2a] py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 rounded-xl bg-[#00FF87] py-2.5 text-sm font-bold text-black hover:bg-[#00cc6a] disabled:opacity-50 transition-colors"
          >
            {isPending ? 'שומר...' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <span className="text-[#00FF87]">|</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(stats: StatRow[]) {
  const header = 'שם,משחקים,ניצחונות,תיקו,הפסדים,שערים+,שערים-,נקודות'
  const rows = stats.map(s =>
    [s.name, s.played, s.wins, s.draws, s.losses, s.goalsFor, s.goalsAgainst, s.points].join(',')
  )
  const csv = '﻿' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'player-stats.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminPanel({
  currentUserId,
  recentGames,
  profiles,
  totalGames,
  totalSessions,
  mostActivePlayer,
  playerStats,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const [confirm, setConfirm] = useState<ConfirmState>(CONFIRM_CLOSED)
  const [editGame, setEditGame] = useState<GameRow | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  function openConfirm(opts: Omit<ConfirmState, 'open'>) {
    setConfirm({ ...opts, open: true })
  }

  function closeConfirm() {
    setConfirm(CONFIRM_CLOSED)
  }

  function run(key: string, action: () => Promise<{ error?: string }>, successMsg: string) {
    setPendingKey(key)
    startTransition(async () => {
      const res = await action()
      setPendingKey(null)
      if (res.error) showToast(res.error, 'error')
      else showToast(successMsg, 'success')
    })
  }

  // ── Data management handlers ──────────────────────────────────────────────

  function handleResetScores() {
    openConfirm({
      title: 'איפוס ניקוד',
      message: 'פעולה זו תמחק את כל המשחקים ותאפס את הניקוד. לא ניתן לבטל.',
      confirmLabel: 'אפס ניקוד',
      dangerous: true,
      onConfirm: () => {
        closeConfirm()
        run('resetScores', resetScores, 'הניקוד אופס בהצלחה')
      },
    })
  }

  function handleDeleteHistory() {
    openConfirm({
      title: 'מחיקת היסטוריה',
      message: 'ימחקו כל הסשנים שהסתיימו ומשחקיהם. סשנים פעילים ופתוחים יישארו.',
      confirmLabel: 'מחק היסטוריה',
      dangerous: true,
      onConfirm: () => {
        closeConfirm()
        run('deleteHistory', deleteHistory, 'ההיסטוריה נמחקה בהצלחה')
      },
    })
  }

  function handleNewSeason() {
    openConfirm({
      title: 'עונה חדשה',
      message: 'פעולה זו תמחק את כל המשחקים, הסשנים וכל ההיסטוריה. לא ניתן לבטל!',
      confirmLabel: 'כן, אני בטוח',
      dangerous: true,
      onConfirm: () => {
        closeConfirm()
        setTimeout(() => {
          openConfirm({
            title: 'אישור סופי — אתה בטוח?',
            message: 'כל הנתונים יימחקו לצמיתות ולא ניתן יהיה לשחזרם. האם להמשיך?',
            confirmLabel: 'מחק הכל',
            dangerous: true,
            onConfirm: () => {
              closeConfirm()
              run('newSeason', newSeason, 'עונה חדשה התחילה!')
            },
          })
        }, 80)
      },
    })
  }

  // ── Game score handler ────────────────────────────────────────────────────

  function handleSaveScore(game: GameRow, s1: number, s2: number) {
    run(
      `edit-${game.id}`,
      () => updateGameScore(game.id, s1, s2),
      'התוצאה עודכנה בהצלחה',
    )
    setEditGame(null)
  }

  // ── User management handlers ──────────────────────────────────────────────

  function handleToggleAdmin(profile: Profile) {
    const next = !profile.is_admin
    openConfirm({
      title: next ? 'הענקת הרשאת אדמין' : 'הסרת הרשאת אדמין',
      message: `${profile.nickname || profile.full_name} ${next ? 'יקבל' : 'יאבד'} הרשאות אדמין.`,
      confirmLabel: 'אשר',
      dangerous: false,
      onConfirm: () => {
        closeConfirm()
        run(
          `admin-${profile.id}`,
          () => setAdminStatus(profile.id, next),
          `הרשאות עודכנו`,
        )
      },
    })
  }

  function handleDeleteUser(profile: Profile) {
    openConfirm({
      title: 'מחיקת משתמש',
      message: `האם למחוק את ${profile.nickname || profile.full_name}? פעולה זו לא ניתנת לביטול.`,
      confirmLabel: 'מחק',
      dangerous: true,
      onConfirm: () => {
        closeConfirm()
        run(
          `del-${profile.id}`,
          () => deleteUser(profile.id),
          'המשתמש נמחק',
        )
      },
    })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const btnBase = 'rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <>
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg border ${
              t.type === 'success'
                ? 'bg-[#00FF87]/10 border-[#00FF87]/30 text-[#00FF87]'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {t.type === 'success' ? '✓ ' : '✗ '}{t.message}
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog state={confirm} onCancel={closeConfirm} />

      {/* Edit score modal */}
      {editGame && (
        <EditModal
          game={editGame}
          onClose={() => setEditGame(null)}
          onSave={(s1, s2) => handleSaveScore(editGame, s1, s2)}
          isPending={isPending && pendingKey === `edit-${editGame.id}`}
        />
      )}

      <div className="space-y-10">
        <h1 className="text-2xl font-bold">
          לוח <span className="text-[#00FF87]">ניהול</span>
        </h1>

        {/* ── Section 1: Data management ─────────────────────────────────── */}
        <Section title="ניהול נתונים">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-5 flex flex-wrap gap-3">
            <button
              onClick={handleResetScores}
              disabled={isPending}
              className={`${btnBase} bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20`}
            >
              {isPending && pendingKey === 'resetScores' ? 'מאפס...' : '🗑 איפוס ניקוד'}
            </button>
            <button
              onClick={handleDeleteHistory}
              disabled={isPending}
              className={`${btnBase} bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20`}
            >
              {isPending && pendingKey === 'deleteHistory' ? 'מוחק...' : '📂 מחיקת היסטוריה'}
            </button>
            <button
              onClick={handleNewSeason}
              disabled={isPending}
              className={`${btnBase} bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40`}
            >
              {isPending && pendingKey === 'newSeason' ? 'מאפס הכל...' : '⚠ עונה חדשה'}
            </button>
          </div>
          <div className="mt-2 space-y-1 text-xs text-zinc-600 px-1">
            <p>איפוס ניקוד — מוחק את כל שורות המשחקים</p>
            <p>מחיקת היסטוריה — מוחק סשנים שהסתיימו ומשחקיהם</p>
            <p>עונה חדשה — מוחק הכל (דורש אישור כפול)</p>
          </div>
        </Section>

        {/* ── Section 2: Edit results ────────────────────────────────────── */}
        <Section title="עריכת תוצאות">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
            {recentGames.length === 0 ? (
              <p className="p-6 text-center text-sm text-zinc-500">אין משחקים עדיין</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                    <th className="px-4 py-3 text-right font-medium">קבוצה 1</th>
                    <th className="px-3 py-3 text-center font-medium">תוצאה</th>
                    <th className="px-4 py-3 text-right font-medium">קבוצה 2</th>
                    <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">תאריך</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {recentGames.map(game => {
                    const t1 = [game.team1_player1_name, game.team1_player2_name].filter(Boolean).join(' + ')
                    const t2 = [game.team2_player1_name, game.team2_player2_name].filter(Boolean).join(' + ')
                    return (
                      <tr key={game.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a]/50">
                        <td className="px-4 py-3 text-sm max-w-[120px] truncate">{t1}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-mono font-bold text-[#00FF87] text-sm">
                            {game.score_team1 ?? '?'} – {game.score_team2 ?? '?'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm max-w-[120px] truncate">{t2}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 hidden sm:table-cell whitespace-nowrap">
                          {formatDate(game.created_at)}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <button
                            onClick={() => setEditGame(game)}
                            disabled={isPending}
                            className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-xs font-medium text-zinc-400 hover:text-[#00FF87] hover:border-[#00FF87]/40 transition-colors"
                          >
                            ערוך
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* ── Section 3: User management ─────────────────────────────────── */}
        <Section title="ניהול משתמשים">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
            {profiles.length === 0 ? (
              <p className="p-6 text-center text-sm text-zinc-500">אין משתמשים</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                    <th className="px-4 py-3 text-right font-medium">שם</th>
                    <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">כינוי</th>
                    <th className="px-4 py-3 text-center font-medium">אדמין</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(profile => {
                    const isMe = profile.id === currentUserId
                    const adminPending = isPending && pendingKey === `admin-${profile.id}`
                    const delPending = isPending && pendingKey === `del-${profile.id}`
                    return (
                      <tr key={profile.id} className={`border-b border-[#1a1a1a] last:border-0 ${isMe ? 'bg-[#00FF87]/5' : 'hover:bg-[#1a1a1a]/50'}`}>
                        <td className="px-4 py-3 text-sm font-medium">
                          {profile.full_name}
                          {isMe && <span className="mr-1.5 text-[10px] text-[#00FF87] font-normal">(אתה)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-400 hidden sm:table-cell">
                          {profile.nickname ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleAdmin(profile)}
                            disabled={isPending || isMe}
                            title={isMe ? 'לא ניתן לשנות הרשאות לעצמך' : undefined}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              profile.is_admin ? 'bg-[#00FF87]' : 'bg-[#2a2a2a]'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                profile.is_admin ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                          {adminPending && <span className="mr-1 text-xs text-zinc-500">...</span>}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleDeleteUser(profile)}
                            disabled={isPending || isMe}
                            title={isMe ? 'לא ניתן למחוק את עצמך' : undefined}
                            className="rounded-lg border border-transparent px-3 py-1 text-xs font-medium text-zinc-600 hover:text-red-400 hover:border-red-500/30 disabled:cursor-not-allowed disabled:opacity-30 transition-colors"
                          >
                            {delPending ? '...' : 'מחק'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Section>

        {/* ── Section 4: System stats ─────────────────────────────────────── */}
        <Section title="סטטיסטיקות מערכת">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard label="סה״כ משחקים" value={String(totalGames)} />
            <StatCard label="סה״כ סשנים" value={String(totalSessions)} />
            <StatCard
              label="הכי פעיל השבוע"
              value={mostActivePlayer ? mostActivePlayer.name : '—'}
              sub={mostActivePlayer ? `${mostActivePlayer.games} משחקים` : undefined}
            />
            <StatCard label="שחקנים רשומים" value={String(profiles.length)} />
          </div>

          <button
            onClick={() => exportCSV(playerStats)}
            className={`${btnBase} bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] hover:bg-[#00FF87]/20`}
          >
            הורד סטטיסטיקות CSV
          </button>
        </Section>
      </div>
    </>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-[#00FF87] truncate">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}
