'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageSquare, Search, Users, Wrench, Palette,
  Share2, CreditCard, LayoutGrid, Clock, Circle, Plus, Megaphone
} from 'lucide-react'

interface Thread {
  id: string
  client_id: string
  department: string
  name: string
  last_message: string | null
  last_message_at: string | null
  client?: { name: string; company: string }
  unread?: number
}

const DEPT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  general: LayoutGrid,
  design:  Palette,
  tech:    Wrench,
  social:  Share2,
  billing: CreditCard,
}
const DEPT_COLOR: Record<string, string> = {
  general: 'text-blue-600',
  design:  'text-violet-600',
  tech:    'text-teal-600',
  social:  'text-pink-600',
  billing: 'text-amber-600',
}
const DEPT_BG: Record<string, string> = {
  general: 'bg-blue-50 border-blue-200',
  design:  'bg-violet-50 border-violet-200',
  tech:    'bg-teal-50 border-teal-200',
  social:  'bg-pink-50 border-pink-200',
  billing: 'bg-amber-50 border-amber-200',
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function MessagesPage() {
  const [threads, setThreads]   = useState<Thread[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<string>('all')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'team' | 'clients'>('all')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/messages/threads')
      const data = await res.json()
      setThreads(Array.isArray(data) ? data : [])
    } catch {
      setThreads([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = threads.filter(t => {
    const matchSearch =
      !search ||
      t.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || t.department === filter
    return matchSearch && matchFilter
  })

  const depts = ['all', 'general', 'design', 'tech', 'social', 'billing']

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg.trim(), target: broadcastTarget }),
      })
      const d = await res.json()
      if (res.ok) {
        setBroadcastMsg('')
        setShowBroadcast(false)
        load() // refresh threads to show broadcast messages
      }
    } catch {}
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="page-header flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Messages
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">All client conversations</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBroadcast(!showBroadcast)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Broadcast
            </button>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{threads.length}</p>
              <p className="text-[10px] text-slate-500">Active threads</p>
            </div>
          </div>
        </div>

        {/* Broadcast Panel */}
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-4 bg-white border border-violet-200 rounded-xl shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-violet-600" /> Broadcast Message
            </p>
            <div className="flex gap-2 mb-3">
              {(['all', 'team', 'clients'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setBroadcastTarget(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    broadcastTarget === t
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-violet-200'
                  }`}
                >
                  {t === 'all' ? 'Everyone' : t === 'team' ? 'Team Only' : 'Clients Only'}
                </button>
              ))}
            </div>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              rows={3}
              placeholder="Type your broadcast message..."
              className="input-dark w-full resize-none mb-2"
            />
            <div className="flex gap-2">
              <button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || sending} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg font-semibold disabled:opacity-40">
                {sending ? 'Sending...' : 'Send Broadcast'}
              </button>
              <button onClick={() => setShowBroadcast(false)} className="px-3 py-2 text-slate-500 text-xs">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client or channel…"
            className="input-dark w-full"
            style={{ paddingLeft: '2.75rem' }}
          />
        </div>

        {/* Dept filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {depts.map(d => {
            const Icon = d !== 'all' ? DEPT_ICON[d] : LayoutGrid
            return (
              <button
                key={d}
                onClick={() => setFilter(d)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-all ${
                  filter === d
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <MessageSquare className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 text-sm">No threads found</p>
          </div>
        ) : (
          filtered.map((t, i) => {
            const Icon = DEPT_ICON[t.department] ?? LayoutGrid
            const color = DEPT_COLOR[t.department] ?? 'text-slate-500'
            const bg = DEPT_BG[t.department] ?? 'bg-slate-50 border-slate-200'
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/messages/${t.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {t.client?.name ?? 'Unknown Client'}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">·</span>
                      <span className={`text-[11px] font-medium ${color} shrink-0`}>
                        {t.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {t.last_message ?? 'No messages yet'}
                    </p>
                    {t.client?.company && (
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        {t.client.company}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {t.last_message_at && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(t.last_message_at)}
                      </span>
                    )}
                    {!t.last_message_at && (
                      <span className="text-[10px] text-blue-500 font-medium">New</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
