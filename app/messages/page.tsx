'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Lock, Users, Plus, Megaphone,
  ChevronDown, ChevronRight, Loader2, Send, X, Building2,
  Hash, UserCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Thread {
  id: string
  client_id: string
  department: string
  name: string
  last_message: string | null
  last_message_at: string | null
  thread_type: string   // 'client' | 'internal' | 'system'
  team_id: string | null
  team_name: string | null
  unread_count: number
  clients?: { name: string; company: string }
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function ThreadRow({ t }: { t: Thread }) {
  const isInternal = t.thread_type === 'internal'
  const unread = t.unread_count ?? 0

  return (
    <Link href={`/messages/${t.id}`}>
      <motion.div
        whileHover={{ x: 2 }}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
          unread > 0
            ? 'bg-blue-50/60 border-blue-200 shadow-sm'
            : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
        }`}
      >
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isInternal ? 'bg-violet-50 border border-violet-200' : 'bg-blue-50 border border-blue-200'
        }`}>
          {isInternal
            ? <Lock className="w-4 h-4 text-violet-500" />
            : <MessageSquare className="w-4 h-4 text-blue-500" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-sm font-semibold truncate ${unread > 0 ? 'text-slate-900' : 'text-slate-800'}`}>
              {t.name || t.department}
            </p>
            {isInternal && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-600 border border-violet-200">
                Internal
              </span>
            )}
          </div>
          {t.last_message ? (
            <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              {t.last_message}
            </p>
          ) : (
            <p className="text-xs text-slate-300 italic">No messages yet</p>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {t.last_message_at && (
            <span className="text-[10px] text-slate-400">{timeAgo(t.last_message_at)}</span>
          )}
          {unread > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      </motion.div>
    </Link>
  )
}

function ClientGroup({ clientName, company, threads }: {
  clientName: string
  company: string
  threads: Thread[]
}) {
  const [open, setOpen] = useState(true)
  const totalUnread = threads.reduce((a, t) => a + (t.unread_count ?? 0), 0)

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 mb-2 rounded-lg hover:bg-slate-50 transition-colors group"
      >
        <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <Building2 className="w-3 h-3 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-slate-800 truncate">{clientName}</p>
          {company && <p className="text-[10px] text-slate-400 truncate">{company}</p>}
        </div>
        <span className="text-[10px] text-slate-400">{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
        {totalUnread > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalUnread}
          </span>
        )}
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        }
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1.5 overflow-hidden pl-2"
          >
            {threads.map(t => <ThreadRow key={t.id} t={t} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FILTER_TABS = [
  { id: 'all',      label: 'All Threads'  },
  { id: 'client',   label: 'Client'       },
  { id: 'internal', label: 'Internal'     },
]

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [threads, setThreads]   = useState<Thread[]>([])
  const [clients, setClients]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<string>('all')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'clients'>('all')
  const [sending, setSending]   = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [newThread, setNewThread] = useState({ client_id: '', name: '', thread_type: 'client', department: 'general' })
  const [creatingThread, setCreatingThread] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [threadRes, clientRes] = await Promise.all([
        fetch('/api/messages/threads'),
        fetch('/api/clients'),
      ])
      const data = await threadRes.json()
      setThreads(Array.isArray(data) ? data : [])
      const cdata = await clientRes.json()
      setClients(Array.isArray(cdata) ? cdata : [])
    } catch {
      setThreads([])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, load])

  // Filter threads
  const filtered = threads.filter(t => {
    const matchSearch = !search ||
      t.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.team_name?.toLowerCase().includes(search.toLowerCase())
    const matchType =
      filter === 'all' ||
      (filter === 'client'   && (t.thread_type === 'client'   || !t.thread_type)) ||
      (filter === 'internal' && t.thread_type === 'internal')
    return matchSearch && matchType
  })

  // Group by client
  const grouped = new Map<string, { clientName: string; company: string; threads: Thread[] }>()
  filtered.forEach(t => {
    const key = t.client_id
    const clientName = t.clients?.name || 'Unknown Client'
    const company    = t.clients?.company || ''
    if (!grouped.has(key)) grouped.set(key, { clientName, company, threads: [] })
    grouped.get(key)!.threads.push(t)
  })

  const totalUnread = threads.reduce((a, t) => a + (t.unread_count ?? 0), 0)

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() || sending) return
    setSending(true)
    try {
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg.trim(), target: broadcastTarget }),
      })
      setBroadcastMsg('')
      setShowBroadcast(false)
      load()
    } finally { setSending(false) }
  }

  const createThread = async () => {
    if (!newThread.client_id || !newThread.name || creatingThread) return
    setCreatingThread(true)
    try {
      const res = await fetch('/api/messages/create-thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThread),
      })
      const thread = await res.json()
      if (thread?.id) {
        // Optimistically add to list with client info
        const clientInfo = clients.find((c: any) => c.id === newThread.client_id)
        setThreads(prev => [{
          ...thread,
          clients: clientInfo ? { name: clientInfo.name, company: clientInfo.company ?? '' } : undefined,
        }, ...prev])
        setShowNewThread(false)
        setNewThread({ client_id: '', name: '', thread_type: 'client', department: 'general' })
        router.push(`/messages/${thread.id}`)
      } else {
        setShowNewThread(false)
        setNewThread({ client_id: '', name: '', thread_type: 'client', department: 'general' })
        load()
      }
    } finally { setCreatingThread(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                {totalUnread}
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Client and internal team conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewThread(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Thread
          </button>
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
          >
            <Megaphone className="w-3.5 h-3.5" />
            Broadcast
          </button>
        </div>
      </div>

      {/* Broadcast panel */}
      <AnimatePresence>
        {showBroadcast && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-800">Send Broadcast</p>
              </div>
              <button onClick={() => setShowBroadcast(false)} className="text-amber-500 hover:text-amber-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {(['all', 'clients'] as const).map(t => (
                <button key={t} onClick={() => setBroadcastTarget(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    broadcastTarget === t
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                  }`}>
                  {t === 'all' ? '📢 All Threads' : '👥 Clients Only'}
                </button>
              ))}
            </div>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="Type your broadcast message…"
              rows={3}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-amber-400 resize-none mb-2"
            />
            <button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || sending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Sending…' : 'Send Broadcast'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients or threads…"
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5">
        {FILTER_TABS.map(tab => {
          const count = tab.id === 'all'
            ? threads.length
            : threads.filter(t => tab.id === 'client'
                ? (t.thread_type === 'client' || !t.thread_type)
                : t.thread_type === tab.id
              ).length
          return (
            <button key={tab.id} onClick={() => setFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filter === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600'
              }`}>
              {tab.id === 'internal' && <Lock className="w-3 h-3" />}
              {tab.id === 'client' && <Users className="w-3 h-3" />}
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-col items-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
          <MessageSquare className="w-10 h-10 text-slate-300" />
          <p className="text-slate-400 text-sm">No threads found</p>
          {search && (
            <button onClick={() => setSearch('')} className="text-blue-500 text-xs hover:underline">Clear search</button>
          )}
        </div>
      ) : (
        <div>
          {Array.from(grouped.entries()).map(([clientId, { clientName, company, threads: cThreads }]) => (
            <ClientGroup key={clientId} clientName={clientName} company={company} threads={cThreads} />
          ))}
        </div>
      )}
      {/* New Thread Modal */}
      <AnimatePresence>
        {showNewThread && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Hash className="w-4 h-4 text-blue-500" /> New Thread</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Create a new communication channel</p>
                </div>
                <button onClick={() => setShowNewThread(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Client</label>
                  <select
                    value={newThread.client_id}
                    onChange={e => setNewThread(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select client…</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Thread Name</label>
                  <input
                    value={newThread.name}
                    onChange={e => setNewThread(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Design Feedback, Billing Questions…"
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Department</label>
                    <select
                      value={newThread.department}
                      onChange={e => setNewThread(p => ({ ...p, department: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-blue-300"
                    >
                      {['general','design','tech','social','billing'].map(d => (
                        <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Type</label>
                    <div className="flex gap-2">
                      {(['client','internal'] as const).map(t => (
                        <button key={t} onClick={() => setNewThread(p => ({ ...p, thread_type: t }))}
                          className={`flex-1 h-10 rounded-xl text-xs font-semibold border transition-all ${
                            newThread.thread_type === t
                              ? t === 'internal' ? 'bg-violet-600 text-white border-violet-600' : 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}>
                          {t === 'internal' ? <><Lock className="w-3 h-3 inline mr-1" />Internal</> : <><UserCircle2 className="w-3 h-3 inline mr-1" />Client</>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={createThread}
                  disabled={!newThread.client_id || !newThread.name || creatingThread}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-sm transition-colors">
                  {creatingThread ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creatingThread ? 'Creating…' : 'Create Thread'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
