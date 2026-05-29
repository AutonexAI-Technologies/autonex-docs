'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Loader2, Search, User, FileText, Receipt, Users, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

interface Log {
  id: string
  user_name: string
  action: string
  entity_type: string
  entity_name?: string
  metadata?: any
  created_at: string
}

const entityIcon: Record<string, any> = {
  client:   Users,
  invoice:  Receipt,
  document: FileText,
  team:     User,
  settings: Settings,
}

const entityColor: Record<string, string> = {
  client:   'text-blue-400 bg-blue-500/10',
  invoice:  'text-violet-400 bg-violet-500/10',
  document: 'text-emerald-400 bg-emerald-500/10',
  team:     'text-amber-400 bg-amber-500/10',
  settings: 'text-slate-400 bg-slate-500/10',
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/activity?limit=200')
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])


  const filtered = logs.filter(l =>
    !search ||
    l.user_name.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="page-header">Activity Log</h1>
          <p className="text-slate-400 text-sm mt-1">Every action is permanently logged. Cannot be edited or deleted.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 w-56 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl focus:border-blue-500/50"
          />
        </div>
      </motion.div>

      {/* Notice */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-slate-400 text-xs"
      >
        <span>🔒</span>
        <span>All entries are <strong className="text-emerald-400">immutable</strong>. No one can edit or delete activity logs — not even the Founder.</span>
      </motion.div>

      {/* Log timeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      >
        <div className="hidden md:grid grid-cols-[auto_2fr_2fr_1fr_1fr] gap-4 px-6 py-3 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
          <span className="w-8" />
          <span>Action</span>
          <span>Entity</span>
          <span>By</span>
          <span>When</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-white font-medium">No activity yet</p>
            <p className="text-slate-500 text-sm mt-1">Actions will appear here as you use the platform</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((log, i) => {
              const Icon = entityIcon[log.entity_type] || Activity
              const colorClass = entityColor[log.entity_type] || 'text-slate-400 bg-slate-500/10'
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-xl ${colorClass} flex items-center justify-center shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-white text-sm">{log.action}</p>
                    <p className="hidden md:block text-slate-400 text-xs">{log.entity_name || log.entity_type}</p>
                    <div className="hidden md:flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-[9px]">
                        {log.user_name.charAt(0)}
                      </div>
                      <span className="text-slate-300 text-xs">{log.user_name}</span>
                    </div>
                    <span className="hidden md:block text-slate-500 text-xs">
                      {format(new Date(log.created_at), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
