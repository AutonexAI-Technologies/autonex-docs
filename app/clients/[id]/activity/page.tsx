'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, User, Clock, FileText, MessageSquare, CreditCard, Settings, GitBranch, Zap, RefreshCw } from 'lucide-react'

interface Log {
  id: string
  user_name: string
  action: string
  entity_type: string
  entity_name: string | null
  metadata: Record<string, any> | null
  created_at: string
}

const ENTITY_ICON: Record<string, any> = {
  client:   User,
  invoice:  CreditCard,
  document: FileText,
  message:  MessageSquare,
  settings: Settings,
  pipeline: GitBranch,
  retainer: RefreshCw,
}
const ENTITY_COLOR: Record<string, string> = {
  client:   'text-blue-500 bg-blue-50 border-blue-200',
  invoice:  'text-amber-500 bg-amber-50 border-amber-200',
  document: 'text-violet-500 bg-violet-50 border-violet-200',
  message:  'text-cyan-500 bg-cyan-50 border-cyan-200',
  settings: 'text-slate-500 bg-slate-50 border-slate-200',
  pipeline: 'text-blue-500 bg-blue-50 border-blue-200',
  retainer: 'text-blue-500 bg-blue-50 border-blue-200',
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function groupByDate(logs: Log[]) {
  const map = new Map<string, Log[]>()
  logs.forEach(log => {
    const d = new Date(log.created_at)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    let label: string
    if (d.toDateString() === today.toDateString()) label = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday'
    else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(log)
  })
  return map
}

export default function ClientActivityPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('activity_logs').select('*')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(100)
    setLogs((data as Log[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`activity-${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'activity_logs',
        filter: `entity_id=eq.${id}`,
      }, (payload: { new: Log }) => {
        setLogs(prev => [payload.new as Log, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, id])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
          <Activity className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm font-medium">No activity recorded yet</p>
        <p className="text-slate-400 text-xs">Actions like stage changes, messages, and invoices appear here</p>
      </div>
    )
  }

  const grouped = groupByDate(logs)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Activity Timeline
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{logs.length} events</span>
          <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            <Zap className="w-2.5 h-2.5" /> Live
          </span>
        </div>
      </div>

      {Array.from(grouped.entries()).map(([date, dayLogs]) => (
        <div key={date} className="mb-6">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{date}</p>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
            <AnimatePresence initial={false}>
              {dayLogs.map((log, i) => {
                const EIcon = ENTITY_ICON[log.entity_type] ?? Activity
                const colorClass = ENTITY_COLOR[log.entity_type] ?? 'text-slate-400 bg-slate-50 border-slate-200'
                return (
                  <motion.div key={log.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex gap-3 mb-4 pl-1">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                      <EIcon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 bg-white border border-slate-100 rounded-xl px-3.5 py-2.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">{log.user_name}</span>
                          {' '}
                          <span className="text-slate-500">{log.action}</span>
                          {log.entity_name && (
                            <> <span className="font-medium text-slate-700">{log.entity_name}</span></>
                          )}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />{timeAgo(log.created_at)}
                        </span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1.5 flex flex-wrap gap-2">
                          {Object.entries(log.metadata).map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded-md">
                              {k}: <strong className="text-slate-600">{String(v)}</strong>
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  )
}
