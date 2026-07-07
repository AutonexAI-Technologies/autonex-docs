'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Megaphone, ArrowLeft } from 'lucide-react'

export default function NewAnnouncementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ title: '', content: '', type: 'info' as string })
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('Team')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        supabase.from('team_members').select('name').eq('email', user.email ?? '').maybeSingle()
          .then(({ data: m }: any) => { if (m) setUserName((m as any).name) })
      }
    })
  }, [supabase])

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim() || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('announcements').insert({
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      author_id: user?.id,
      author_name: userName,
    })
    setSaving(false)
    if (!error) router.push('/announcements')
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">New Announcement</h1>
            <p className="text-sm text-slate-500">Broadcast to all client portal users</p>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New feature released — check it out!"
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-dark w-full">
              <option value="info">Info</option>
              <option value="update">Update</option>
              <option value="maintenance">Maintenance</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write your announcement here…"
              rows={6}
              className="input-dark w-full resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={submit}
              disabled={!form.title.trim() || !form.content.trim() || saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-40"
            >
              <Megaphone className="w-4 h-4" />
              {saving ? 'Publishing…' : 'Publish Announcement'}
            </button>
            <button onClick={() => router.back()} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
