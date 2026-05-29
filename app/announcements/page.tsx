'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone, Pin, Clock, Plus, X, Loader2
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  author_name: string
  pinned: boolean
  expires_at: string | null
  created_at: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'Just now'
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', pinned: false })
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('Autonex AI')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements((data as Announcement[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        supabase.from('team_members').select('name').eq('email', user.email ?? '').single()
          .then(({ data: m }: any) => { if (m) setUserName((m as any).name) })
      }
    })
    // Realtime
    const ch = supabase.channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, supabase])

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim() || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('announcements').insert({
      title: form.title.trim(),
      content: form.content.trim(),
      pinned: form.pinned,
      author_id: user?.id,
      author_name: userName,
    })
    setForm({ title: '', content: '', pinned: false })
    setShowNew(false)
    setSaving(false)
  }

  const togglePin = async (a: Announcement) => {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id)
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, pinned: !a.pinned } : x))
  }

  const del = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-400" />
            Announcements
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Broadcast to all portal clients</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Compose drawer */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mx-6 mt-4 p-4 bg-white border border-slate-200 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">New Announcement</p>
              <button onClick={() => setShowNew(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title…"
              className="input-dark w-full mb-2"
            />
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement…"
              rows={4}
              className="input-dark w-full resize-none mb-3"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="rounded border-white/20 bg-slate-50 text-blue-500"
                />
                <Pin className="w-3.5 h-3.5" /> Pin to top
              </label>
              <button
                onClick={submit}
                disabled={!form.title.trim() || !form.content.trim() || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                Broadcast
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Megaphone className="w-10 h-10 text-slate-700" />
            <p className="text-slate-500 text-sm">No announcements yet</p>
            <button onClick={() => setShowNew(true)} className="text-blue-400 text-xs hover:underline">
              Create your first one
            </button>
          </div>
        ) : (
          announcements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`p-4 rounded-2xl border transition-all group ${
                a.pinned
                  ? 'bg-blue-600/8 border-blue-500/20'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {a.pinned && <Pin className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{a.title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => togglePin(a)}
                    className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${a.pinned ? 'text-blue-400' : 'text-slate-500'}`}
                    title={a.pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => del(a.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap mb-3">{a.content}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-600">
                <span>{a.author_name}</span>
                <span>·</span>
                <Clock className="w-3 h-3" />
                <span>{timeAgo(a.created_at)}</span>
                {a.expires_at && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500">
                      Expires {new Date(a.expires_at).toLocaleDateString('en-IN')}
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
