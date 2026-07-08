'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone, Pin, Clock, Plus, X, Loader2, Building2,
  Globe, Sparkles, ChevronDown, Bell, Edit3,
} from 'lucide-react'
import { useUserRole } from '@/lib/useUserRole'

interface Announcement {
  id: string
  title: string
  content: string
  author_name: string
  pinned: boolean
  expires_at: string | null
  created_at: string
  department_id: string | null
  departments?: { name: string } | null
}

interface Department { id: string; name: string }

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'Just now'
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function AuthorAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-blue-600 to-blue-700',
    'from-violet-600 to-violet-700',
    'from-emerald-600 to-emerald-700',
    'from-amber-600 to-amber-700',
    'from-rose-600 to-rose-700',
    'from-cyan-600 to-cyan-700',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
      <span className="text-[11px] font-bold text-white">{initials}</span>
    </div>
  )
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', pinned: false, department_id: '' })
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('Autonex AI')
  const [myDeptId, setMyDeptId] = useState<string | null>(null)
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const supabase = createClient()
  const { role_name, isAdmin } = useUserRole()

  const canPost = isAdmin || role_name === 'Founder' || role_name === 'Managing Director' || role_name === 'Head'
  const isHead = role_name === 'Head' && !isAdmin

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('announcements')
      .select('*, departments(name)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (myDeptId && !isAdmin && role_name !== 'Founder' && role_name !== 'Managing Director') {
      q = (q as any).or(`department_id.is.null,department_id.eq.${myDeptId}`)
    }

    const { data } = await q
    setAnnouncements((data as Announcement[]) ?? [])
    setLoading(false)
  }, [supabase, myDeptId, isAdmin, role_name])

  useEffect(() => {
    supabase.from('departments').select('id, name').order('name')
      .then(({ data }: { data: any }) => setDepartments(data ?? []))

    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) return
      supabase.from('team_members').select('name, roles(department_id)').eq('email', user.email ?? '').maybeSingle()
        .then(({ data: m }: any) => {
          if (m) {
            setUserName(m.name)
            setMyDeptId(m.roles?.department_id ?? null)
          }
        })
    })
  }, [supabase])

  useEffect(() => {
    load()
    const ch = supabase.channel('announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, supabase])

  useEffect(() => {
    if (isHead && myDeptId) setForm(f => ({ ...f, department_id: myDeptId }))
  }, [isHead, myDeptId])

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
      department_id: form.department_id || null,
    })
    setForm({ title: '', content: '', pinned: false, department_id: isHead && myDeptId ? myDeptId : '' })
    setShowNew(false)
    setSaving(false)
  }

  const togglePin = async (a: Announcement) => {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id)
    setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, pinned: !a.pinned } : x))
  }

  const del = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(x => x.id !== id))
  }

  // Dept filter
  const filtered = deptFilter === 'all'
    ? announcements
    : deptFilter === 'company'
    ? announcements.filter(a => !a.department_id)
    : announcements.filter(a => a.department_id === deptFilter)

  const pinnedList = filtered.filter(a => a.pinned)
  const regularList = filtered.filter(a => !a.pinned)

  return (
    <div className="flex flex-col h-full bg-[#080c12]">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <Megaphone className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Announcements</h1>
                <p className="text-xs text-[var(--text-tertiary)]">Company-wide & department updates</p>
              </div>
            </div>
          </div>
          {canPost && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              New Announcement
            </button>
          )}
        </div>

        {/* Dept Filter Chips */}
        {(isAdmin || role_name === 'Founder' || role_name === 'Managing Director') && (
          <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-thin">
            {[
              { id: 'all', label: 'All', icon: Bell },
              { id: 'company', label: 'Company-wide', icon: Globe },
              ...departments.map(d => ({ id: d.id, label: d.name, icon: Building2 })),
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDeptFilter(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all ${
                  deptFilter === id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-white/[0.08] text-[var(--text-tertiary)] hover:text-slate-200 hover:border-white/[0.15]'
                }`}
                style={deptFilter !== id ? { background: 'rgba(255,255,255,0.04)' } : {}}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mb-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8 scrollbar-thin">

        {/* Compose Form */}
        <AnimatePresence>
          {showNew && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="mb-6 rounded-2xl overflow-hidden"
              style={{ background: 'rgba(13,17,23,0.9)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
            >
              {/* Compose header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                    <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-white">New Announcement</p>
                </div>
                <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-white/[0.07] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Title */}
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title…"
                  className="w-full text-base font-semibold text-white placeholder:text-[var(--text-secondary)] bg-transparent outline-none border-b border-white/[0.08] pb-3"
                />

                {/* Content */}
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your announcement… You can use plain text."
                  rows={5}
                  className="w-full text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-secondary)] bg-transparent outline-none resize-none leading-relaxed"
                />

                {/* Bottom controls */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    {/* Audience */}
                    <select
                      value={form.department_id}
                      onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                      disabled={isHead}
                      className="h-8 px-3 rounded-lg text-[12px] text-[var(--text-secondary)] outline-none border border-white/[0.09] transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <option value="">🌐 Everyone</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>🏢 {d.name}</option>
                      ))}
                    </select>

                    {/* Pin toggle */}
                    <button
                      onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all ${
                        form.pinned
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                          : 'text-[var(--text-tertiary)] border-white/[0.08] hover:text-[var(--text-secondary)]'
                      }`}
                      style={!form.pinned ? { background: 'rgba(255,255,255,0.04)' } : {}}
                    >
                      <Pin className="w-3 h-3" />
                      {form.pinned ? 'Pinned' : 'Pin'}
                    </button>
                  </div>

                  <button
                    onClick={submit}
                    disabled={!form.title.trim() || !form.content.trim() || saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff' }}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {form.department_id ? 'Post to Department' : 'Broadcast to All'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="w-14 h-14 rounded-2xl border border-white/[0.08] flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Megaphone className="w-6 h-6 text-[var(--text-secondary)]" />
            </div>
            <div className="text-center">
              <p className="text-[var(--text-tertiary)] font-medium mb-1">No announcements yet</p>
              <p className="text-[var(--text-secondary)] text-sm">Important updates will appear here.</p>
            </div>
            {canPost && (
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-400 border border-blue-500/20 hover:bg-blue-600/10 transition-all">
                <Plus className="w-4 h-4" />
                Create First Announcement
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {/* Pinned section */}
            {pinnedList.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Pin className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Pinned</span>
                </div>
                <div className="space-y-3">
                  {pinnedList.map((a, i) => (
                    <AnnouncementCard key={a.id} a={a} i={i} canPost={canPost} onPin={togglePin} onDelete={del} />
                  ))}
                </div>
                {regularList.length > 0 && (
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Recent</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                )}
              </div>
            )}

            {/* Regular */}
            <div className="space-y-3">
              {regularList.map((a, i) => (
                <AnnouncementCard key={a.id} a={a} i={i + pinnedList.length} canPost={canPost} onPin={togglePin} onDelete={del} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AnnouncementCard({ a, i, canPost, onPin, onDelete }: {
  a: Announcement
  i: number
  canPost: boolean
  onPin: (a: Announcement) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isLong = a.content.length > 240
  const preview = isLong && !expanded ? a.content.slice(0, 240) + '…' : a.content

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.3 }}
      className={`group rounded-2xl p-5 transition-all ${
        a.pinned
          ? 'border border-blue-500/20'
          : 'border border-white/[0.07] hover:border-white/[0.12]'
      }`}
      style={{
        background: a.pinned
          ? 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))'
          : 'rgba(255,255,255,0.03)',
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AuthorAvatar name={a.author_name} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {a.pinned && <Pin className="w-3 h-3 text-blue-400 shrink-0" />}
              <h3 className="text-sm font-bold text-white truncate">{a.title}</h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-medium text-[var(--text-tertiary)]">{a.author_name}</span>
              <span className="text-[var(--text-secondary)]">·</span>
              <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {timeAgo(a.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dept / scope badge */}
          {a.department_id && a.departments ? (
            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-violet-500/20 text-violet-400 font-semibold"
              style={{ background: 'rgba(139,92,246,0.1)' }}>
              <Building2 className="w-2.5 h-2.5" />
              {a.departments.name}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-white/[0.08] text-[var(--text-tertiary)] font-semibold"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Globe className="w-2.5 h-2.5" />
              Company
            </span>
          )}

          {/* Actions (hover reveal) */}
          {canPost && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onPin(a)}
                title={a.pinned ? 'Unpin' : 'Pin to top'}
                className={`p-1.5 rounded-lg transition-colors ${
                  a.pinned
                    ? 'text-blue-400 hover:bg-blue-500/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:bg-white/[0.06]'
                }`}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(a.id)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap pl-11">
        {preview}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 mt-2 ml-11 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Expiry */}
      {a.expires_at && (
        <div className="flex items-center gap-1.5 mt-3 pl-11">
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
            ⏰ Expires {new Date(a.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      )}
    </motion.div>
  )
}
