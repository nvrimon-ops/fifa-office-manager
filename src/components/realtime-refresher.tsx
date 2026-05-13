'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  tables: string[]
}

export default function RealtimeRefresher({ tables }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channels = tables.map(table =>
      supabase
        .channel(`realtime:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          router.refresh()
        })
        .subscribe()
    )

    return () => {
      channels.forEach(c => supabase.removeChannel(c))
    }
  }, [router, tables])

  return null
}
