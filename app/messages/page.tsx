'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Search, Lock, Users, Plus, Megaphone,
  ChevronDown, ChevronRight, Loader2, Send, X, Building2,
  Hash, UserCircle2, Sparkles, RefreshCw, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Thread {
  id: string
  client_id: string
  department: string
  name: string
  last_message: string | null
  last_message_at: string | null
  thread_type: string
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

const DEPT_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  general:  { bg: 'bg-blue-500/10',   dot: 'bg-blue-400',   text: 'text-blue-400' },
  design:   { bg: 'bg-violet-500/10', dot: 'bg-violet-400', text: 'text-violet-400' },
  tech:     { bg: 'bg-cyan-500/10',   dot: 'bg-cyan-400',   text: 'text-cyan-400' },
  social:   { bg: 'bg-pink-500/10',   dot: 'bg-pink-400',   text: 'text-pink-400' },
  billing:  { bg: 'bg-amber-500/10',  dot: 'bg-amber-400',  text: 'text-amber-400' },
  internal: { bg: 'bg-purple-500/10', dot: 'bg-purple-400', text: 'text-purple-400' },
}

function getDeptStyle(dept: string, type: string) {
  if (type === 'internal') return DEPT_COLORS.internal
  return DEPT_COLORS[dept] || DEPT_COLORS.general
}

function ThreadRow({ t }: { t: Thread }) {
  const isInternal = t.thread_type === 'internal'
  const unread = t.unread_count ?? 0
  const deptStyle = getDeptStyle(t.department, t.thread_type)

  return (
    <Link href={`/messages/${t.id}`}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
          unread > 0 ? 'bg-[var(--accent-light)]' : ''
        }`}
        onMouseEnter={e => { if (!(e.currentTarget as HTMLDivElement).style.background.includes('accent')) (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.03)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = unread > 0 ? 'var(--accent-light)' : '' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative" style={{ background: deptStyle.bg }}>
          {isInternal
            ? <Lock className="w-3.5 h-3.5" style={{ color: deptStyle.text.replace('text-', '') }} />
            : <Hash className="w-3.5 h-3.5" style={{ color: deptStyle.text.replace('text-', '') }} />
          }
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-[13px] truncate leading-tight" style={{ color: 'var(--text-primary)', fontWeight: unread > 0 ? 600 : 400 }}>
              {t.name || t.department}
            </p>
            {isInternal && (
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ background: '#5856D625', color: '#5856D6', border: '1px solid #5856D620' }}>
                Private
              </span>
            )}
          </div>
          {t.last_message ? (
            <p className="text-[11px] truncate" style={{ color: unread > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{t.last_message}</p>
          ) : (
            <p className="text-[11px] italic" style={{ color: 'var(--text-tertiary)' }}>No messages yet</p>
          )}
        </div>
        {t.last_message_at && (
          <span className="text-[10px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(t.last_message_at)}</span>
        )}
      </div>
    </Link>
  )
}

function ClientGroup({ clientName, company, threads, onCreateChannels, creatingFor }: {
  clientName: string
  company: string
  threads: Thread[]
  onCreateChannels: (clientId: string) => void
  creatingFor: string | null
}) {
  const [open, setOpen] = useState(true)
  const totalUnread = threads.reduce((a, t) => a + (t.unread_count ?? 0), 0)
  const clientId = threads[0]?.client_id
  const hasNoChannels = threads.length === 0

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.03)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
          <span className="text-[9px] font-bold" style={{ color: 'var(--accent)' }}>
            {clientName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
            {clientName}
          </p>
          {company && <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>{company}</p>}
        </div>
        {totalUnread > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            {totalUnread}
          </span>
        )}
        {open ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-2"
          >
            {threads.length === 0 ? (
              <div className="px-3 py-3 mx-2 rounded-lg text-center" style={{ border: '1.5px dashed var(--border-strong)', background: 'var(--surface-2)' }}>
                <p className="text-[11px] mb-2" style={{ color: 'var(--text-tertiary)' }}>No channels yet</p>
                <button
                  onClick={() => onCreateChannels(clientId)}
                  disabled={creatingFor === clientId}
                  className="btn btn-sm gap-1.5 mx-auto"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid rgba(0,113,227,0.2)' }}
                >
                  {creatingFor === clientId
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />
                  }
                  {creatingFor === clientId ? 'Creating…' : 'Create Default Channels'}
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {threads.map(t => <ThreadRow key={t.id} t={t} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FILTER_TABS = [
  { id: 'all',      label: 'All',      icon: MessageSquare },
  { id: 'client',   label: 'Client',   icon: Users },
  { id: 'internal', label: 'Internal', icon: Lock },
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
  const [creatingChannelsFor, setCreatingChannelsFor] = useState<string | null>(null)

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

  useEffect(() => {
    const ch = supabase
      .channel('messages-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, load])

  // Create default channels for a client
  const handleCreateChannels = async (clientId: string) => {
    setCreatingChannelsFor(clientId)
    try {
      const res = await fetch('/api/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      if (res.ok) {
        await load()
      }
    } finally {
      setCreatingChannelsFor(null)
    }
  }

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

  // Group by client (including clients with zero threads for 'all' filter)
  const grouped = new Map<string, { clientName: string; company: string; threads: Thread[] }>()
  
  // Add all clients first (so clients with 0 threads also appear in 'all' view)
  if (filter === 'all' && !search) {
    clients.forEach((c: any) => {
      if (!grouped.has(c.id)) {
        grouped.set(c.id, { clientName: c.name, company: c.company || '', threads: [] })
      }
    })
  }
  
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
    <div className="flex h-[calc(100vh-52px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        
        {/* Sidebar Header */}
        <div className="px-4 pt-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
                <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              </div>
              <h1 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Messages</h1>
              {totalUnread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold" style={{ background: 'var(--accent)' }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={load} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" title="Refresh"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowNewThread(true)} className="w-7 h-7 rounded-md flex items-center justify-center transition-colors" title="New Thread"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="input w-full pl-8 h-8 text-[12px]"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-3 pt-3 pb-2">
          {FILTER_TABS.map(tab => {
            const count = tab.id === 'all'
              ? threads.length
              : threads.filter(t => tab.id === 'client'
                  ? (t.thread_type === 'client' || !t.thread_type)
                  : t.thread_type === tab.id
                ).length
            const Icon = tab.icon
            const isActive = filter === tab.id
            return (
              <button key={tab.id} onClick={() => setFilter(tab.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={isActive
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { color: 'var(--text-secondary)', background: 'transparent' }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {count > 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)', color: isActive ? '#fff' : 'var(--text-secondary)' }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Broadcast button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setShowBroadcast(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all"
            style={{ background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', color: '#A06800' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,159,10,0.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,159,10,0.1)'}
          >
            <Megaphone className="w-3.5 h-3.5" />
            Send Broadcast
            <Zap className="w-3 h-3 ml-auto opacity-60" />
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          ) : grouped.size === 0 ? (
            <div className="flex flex-col items-center py-12 px-4 gap-3 text-center">
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-slate-500 text-[12px]">No conversations found</p>
              {search && (
                <button onClick={() => setSearch('')} className="text-blue-400 text-[11px] hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="pt-1">
              {Array.from(grouped.entries()).map(([clientId, { clientName, company, threads: cThreads }]) => (
                <ClientGroup
                  key={clientId}
                  clientName={clientName}
                  company={company}
                  threads={cThreads}
                  onCreateChannels={handleCreateChannels}
                  creatingFor={creatingChannelsFor}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main panel — empty state when no thread is selected */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#080c12] relative">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px]"
            style={{ background: 'rgba(37,99,235,0.04)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center px-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
            <MessageSquare className="w-7 h-7 text-slate-600" />
          </div>
          <h2 className="text-slate-400 font-semibold text-base mb-1.5">Select a conversation</h2>
          <p className="text-slate-600 text-sm max-w-xs">
            Choose a thread from the sidebar to view messages, or create a new thread.
          </p>
          <button
            onClick={() => setShowNewThread(true)}
            className="mt-6 flex items-center gap-2 mx-auto px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            New Thread
          </button>
        </motion.div>
      </div>

      {/* Broadcast modal */}
      <AnimatePresence>
        {showBroadcast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Send Broadcast</p>
                    <p className="text-[10px] text-slate-500">Sends to all threads in the selected scope</p>
                  </div>
                </div>
                <button onClick={() => setShowBroadcast(false)} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  {(['all', 'clients'] as const).map(t => (
                    <button key={t} onClick={() => setBroadcastTarget(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        broadcastTarget === t
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/[0.07]'
                      }`}>
                      {t === 'all' ? '📢 All Threads' : '👥 Clients Only'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="Type your broadcast message…"
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none resize-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button onClick={sendBroadcast} disabled={!broadcastMsg.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-semibold text-sm transition-all">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send Broadcast'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Thread modal */}
      <AnimatePresence>
        {showNewThread && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">New Thread</p>
                    <p className="text-[10px] text-slate-500">Create a new communication channel</p>
                  </div>
                </div>
                <button onClick={() => setShowNewThread(false)} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-slate-500 hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* Client selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Client</label>
                  <select
                    value={newThread.client_id}
                    onChange={e => setNewThread(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  >
                    <option value="">Select client…</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                    ))}
                  </select>
                </div>
                {/* Thread Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Thread Name</label>
                  <input
                    value={newThread.name}
                    onChange={e => setNewThread(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Design Feedback, Billing Questions…"
                    className="w-full h-10 px-3 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                </div>
                {/* Department & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Department</label>
                    <select
                      value={newThread.department}
                      onChange={e => setNewThread(p => ({ ...p, department: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      {['general','design','tech','social','billing'].map(d => (
                        <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Type</label>
                    <div className="flex gap-1.5">
                      {(['client','internal'] as const).map(t => (
                        <button key={t} onClick={() => setNewThread(p => ({ ...p, thread_type: t }))}
                          className={`flex-1 h-10 rounded-xl text-[11px] font-semibold border transition-all ${
                            newThread.thread_type === t
                              ? t === 'internal'
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-blue-600 text-white border-blue-600'
                              : 'text-slate-400 border-white/[0.08] hover:bg-white/[0.05]'
                          }`}
                          style={newThread.thread_type !== t ? { background: 'rgba(255,255,255,0.04)' } : {}}
                        >
                          {t === 'internal' ? '🔒 Private' : '💬 Client'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={createThread}
                  disabled={!newThread.client_id || !newThread.name || creatingThread}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-sm transition-all">
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
