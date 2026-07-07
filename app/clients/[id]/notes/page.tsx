'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  StickyNote, Pin, Plus, Trash2, Pencil, X, Save, Clock, User
} from 'lucide-react'

interface Note {
  id: string
  author_name: string
  content: string
  pinned: boolean
  created_at: string
  updated_at: string
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'Just now'
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotesPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('Team')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('internal_notes')
      .select('*')
      .eq('client_id', id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setNotes((data as Note[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        supabase.from('team_members').select('name').eq('email', user.email ?? '').maybeSingle()
          .then(({ data: m }: any) => { if (m) setUserName((m as any).name) })
      }
    })
  }, [load, supabase])

  const add = async () => {
    if (!newNote.trim() || saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('internal_notes').insert({
      client_id: id,
      author_id: user?.id,
      author_name: userName,
      content: newNote.trim(),
    })
    setNewNote('')
    setSaving(false)
    load()
  }

  const togglePin = async (note: Note) => {
    await supabase.from('internal_notes').update({ pinned: !note.pinned }).eq('id', note.id)
    load()
  }

  const startEdit = (n: Note) => { setEditing(n.id); setEditContent(n.content) }

  const saveEdit = async () => {
    if (!editing || saving) return
    setSaving(true)
    await supabase.from('internal_notes').update({ content: editContent, updated_at: new Date().toISOString() }).eq('id', editing)
    setEditing(null)
    setSaving(false)
    load()
  }

  const del = async (noteId: string) => {
    await supabase.from('internal_notes').delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  return (
    <div className="space-y-5">
      {/* Add note */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <StickyNote className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-900">Add Internal Note</span>
          <span className="text-[10px] text-slate-600 ml-auto">Team-only — never visible to clients</span>
        </div>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Write a private note about this client…"
          rows={3}
          className="input-dark w-full resize-none mb-3"
        />
        <div className="flex justify-end">
          <button onClick={add} disabled={!newNote.trim() || saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" />Add Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <StickyNote className="w-10 h-10 text-slate-700" />
          <p className="text-slate-500 text-sm">No internal notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`group p-4 rounded-xl border transition-all ${
                n.pinned ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white border-slate-200'
              }`}
            >
              {editing === n.id ? (
                <div className="space-y-3">
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="input-dark w-full resize-none" rows={4} />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg"><Save className="w-3 h-3" />Save</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-slate-400 text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">{n.content}</p>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => togglePin(n)} className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${n.pinned ? 'text-amber-400' : 'text-slate-500'}`}>
                        <Pin className="w-3 h-3" />
                      </button>
                      <button onClick={() => startEdit(n)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-white transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => del(n.id)} className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{n.author_name}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{timeAgo(n.created_at)}</span>
                    {n.pinned && <><span>·</span><span className="text-amber-400 flex items-center gap-1"><Pin className="w-2.5 h-2.5" />Pinned</span></>}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
