'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, User, Clock, FileText, MessageSquare, CreditCard, Settings } from 'lucide-react'

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

export default function ClientActivityPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs((data as Log[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Activity className="w-10 h-10 text-slate-700" />
        <p className="text-slate-500 text-sm">No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Activity Log
        </h2>
        <span className="text-xs text-slate-500">{logs.length} events</span>
      </div>

      <div className="relative">
        {logs.map((log, i) => {
          const EIcon = ENTITY_ICON[log.entity_type] ?? Activity
          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex gap-3 mb-0"
            >
              <div className="flex flex-col items-center w-7 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <EIcon className="w-3 h-3 text-slate-400" />
                </div>
                {i < logs.length - 1 && <div className="w-px flex-1 bg-slate-50 my-1" />}
              </div>
              <div className={`flex-1 pb-4 ${i < logs.length - 1 ? '' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-700">
                      <span className="font-medium text-slate-300">{log.user_name}</span>
                      {' '}
                      <span className="text-slate-400">{log.action}</span>
                      {log.entity_name && (
                        <> <span className="text-slate-300 font-medium">{log.entity_name}</span></>
                      )}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {Object.entries(log.metadata)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 shrink-0 flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />{timeAgo(log.created_at)}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
