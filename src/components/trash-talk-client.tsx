'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendTrashTalk } from '@/app/sessions/[id]/actions'
import type { Profile, TrashTalk } from '@/types/database'

interface MessageWithProfile extends TrashTalk {
  profile: Profile
}

interface Props {
  sessionId: string
  currentUserId: string
  initialMessages: MessageWithProfile[]
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

export default function TrashTalkClient({ sessionId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`trash_talk:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trash_talk', filter: `session_id=eq.${sessionId}` },
        async payload => {
          // Fetch profile for new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single()

          if (profile) {
            const msg = { ...(payload.new as TrashTalk), profile }
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)
    const msg = text.trim()
    setText('')
    startTransition(async () => {
      const res = await sendTrashTalk(sessionId, msg)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a]">
        <h3 className="font-semibold">💬 טראש טוק</h3>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-zinc-600 py-8">אין הודעות עדיין. תתחיל לאגרף!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.user_id === currentUserId
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="h-7 w-7 shrink-0 rounded-full bg-[#00FF87]/10 flex items-center justify-center text-[#00FF87] text-xs font-bold">
                  {(msg.profile.nickname || msg.profile.full_name).charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isMe
                        ? 'bg-[#00FF87] text-black rounded-tl-sm'
                        : 'bg-[#1a1a1a] text-white rounded-tr-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-xs text-zinc-600">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-[#2a2a2a]">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="כתוב משהו..."
          maxLength={280}
          className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm outline-none focus:border-[#00FF87] placeholder-zinc-600"
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-xl bg-[#00FF87] px-4 py-2 text-sm font-bold text-black disabled:opacity-50 hover:bg-[#00cc6a] transition-colors"
        >
          שלח
        </button>
      </form>
      {error && <p className="px-3 pb-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
