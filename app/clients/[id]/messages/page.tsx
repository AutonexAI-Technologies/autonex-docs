'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  MessageSquare, LayoutGrid, Palette, Wrench, Share2, CreditCard,
  ChevronRight, Clock, Plus, Loader2
} from 'lucide-react'

interface Thread {
  id: string
  department: string
  name: string
  last_message: string | null
  last_message_at: string | null
}

const DEPT_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  general: { icon: LayoutGrid, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  design:  { icon: Palette,    color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  tech:    { icon: Wrench,     color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/20' },
  social:  { icon: Share2,     color: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20' },
  billing: { icon: CreditCard, color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
}

function timeAgo(d: string | null) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function ClientMessagesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('client_id', id)
      .order('last_message_at', { ascending: false, nullsFirst: false })
    setThreads((data as Thread[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const seedThreads = async () => {
    setSeeding(true)
    await supabase.rpc('create_default_chat_threads', { p_client_id: id })
    setSeeding(false)
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <MessageSquare className="w-12 h-12 text-slate-700" />
        <p className="text-slate-500 text-sm">No message channels yet</p>
        <button onClick={seedThreads} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors disabled:opacity-50">
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Default Channels
        </button>
        <p className="text-xs text-slate-500">Creates: General, Design, Tech, Social, Billing</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          Message Channels
        </h2>
        <span className="text-xs text-slate-500">{threads.length} channels</span>
      </div>

      {threads.map((t, i) => {
        const cfg = DEPT_CONFIG[t.department] ?? DEPT_CONFIG.general
        const Icon = cfg.icon
        return (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(`/messages/${t.id}`)}
            className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-blue-50 transition-all text-left group"
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.border}`}>
              <Icon className={`w-4 h-4 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {t.last_message ?? 'No messages yet'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.last_message_at && (
                <span className="text-[10px] text-slate-600 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />{timeAgo(t.last_message_at)}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
