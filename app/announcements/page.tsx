'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Pin, Clock, Plus, X, Loader2, Building2 } from 'lucide-react'
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

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', pinned: false, department_id: '' })
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('Autonex AI')
  const [myDeptId, setMyDeptId] = useState<string | null>(null)
  const supabase = createClient()
  const { role_name, isAdmin } = useUserRole()

  // Who can post: Founder, MD (isAdmin), Head
  const canPost = isAdmin || role_name === 'Founder' || role_name === 'Managing Director' || role_name === 'Head'
  // Head can only post to their dept
  const isHead = role_name === 'Head' && !isAdmin

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('announcements')
      .select('*, departments(name)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })

    // Heads/Seniors/Juniors/Interns: show company-wide + their dept
    if (myDeptId && !isAdmin && role_name !== 'Founder' && role_name !== 'Managing Director') {
      q = (q as any).or(`department_id.is.null,department_id.eq.${myDeptId}`)
    }

    const { data } = await q
    setAnnouncements((data as Announcement[]) ?? [])
    setLoading(false)
  }, [supabase, myDeptId, isAdmin, role_name])

  useEffect(() => {
    // Load departments
    supabase.from('departments').select('id, name').order('name')
      .then(({ data }: { data: any }) => setDepartments(data ?? []))

    // Get current user name + dept
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) return
      supabase.from('team_members').select('name, roles(department_id)').eq('email', user.email ?? '').single()
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

  // Pre-fill dept for Heads
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
          <p className="text-sm text-slate-500 mt-0.5">Company-wide & department updates</p>
        </div>
        {canPost && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      {/* Compose drawer */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="mx-6 mt-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-900">New Announcement</p>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title…" className="input-dark w-full mb-2" />
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement…" rows={4} className="input-dark w-full resize-none mb-3" />

            {/* Dept selector — Founder/MD see all, Head sees their dept only */}
            <div className="mb-3">
              <label className="text-xs text-slate-500 mb-1 block">Audience</label>
              <select value={form.department_id}
                onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                disabled={isHead}
                className="input-dark w-full text-sm">
                <option value="">🌐 Company-wide (everyone)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>🏢 {d.name} only</option>
                ))}
              </select>
              {isHead && <p className="text-[11px] text-slate-400 mt-1">Heads can only post to their department</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-500" />
                <Pin className="w-3.5 h-3.5" /> Pin to top
              </label>
              <button onClick={submit} disabled={!form.title.trim() || !form.content.trim() || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                {form.department_id ? 'Post to Dept' : 'Broadcast'}
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
            <Megaphone className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 text-sm">No announcements yet</p>
            {canPost && <button onClick={() => setShowNew(true)} className="text-blue-600 text-xs hover:underline">Create your first one</button>}
          </div>
        ) : (
          announcements.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`p-4 rounded-2xl border transition-all group ${a.pinned ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {a.pinned && <Pin className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{a.title}</h3>
                  {a.department_id && a.departments && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-full shrink-0">
                      <Building2 className="w-2.5 h-2.5" />{a.departments.name}
                    </span>
                  )}
                  {!a.department_id && (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full shrink-0">Company-wide</span>
                  )}
                </div>
                {canPost && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => togglePin(a)} title={a.pinned ? 'Unpin' : 'Pin'}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${a.pinned ? 'text-blue-500' : 'text-slate-400'}`}>
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-3">{a.content}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="font-medium text-slate-600">{a.author_name}</span>
                <span>·</span>
                <Clock className="w-3 h-3" />
                <span>{timeAgo(a.created_at)}</span>
                {a.expires_at && (
                  <><span>·</span><span className="text-amber-500">Expires {new Date(a.expires_at).toLocaleDateString('en-IN')}</span></>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
