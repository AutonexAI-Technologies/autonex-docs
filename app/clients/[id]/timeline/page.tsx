'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Milestone, CheckCircle2, Clock, AlertTriangle, Play,
  Plus, Pencil, Trash2, GripVertical, Calendar, X, Save
} from 'lucide-react'

interface MilestoneItem {
  id: string
  project_id: string
  name: string
  description: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  estimated_date: string | null
  actual_date: string | null
  sort_order: number
  notes: string | null
}
interface Project {
  id: string
  name: string
  service_type: string
  status: string
  progress: number
}

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     icon: Clock,          color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/20', line: 'bg-slate-500/30' },
  in_progress: { label: 'In Progress', icon: Play,           color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',  line: 'bg-blue-500' },
  completed:   { label: 'Completed',   icon: CheckCircle2,   color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',line: 'bg-emerald-500' },
  blocked:     { label: 'Blocked',     icon: AlertTriangle,  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',   line: 'bg-red-500/50' },
}

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<MilestoneItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', status: '', estimated_date: '', notes: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: proj }, { data: ms }] = await Promise.all([
      supabase.from('projects').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('project_milestones').select('*').eq('client_id', id).order('sort_order', { ascending: true }),
    ])
    setProject(proj as any)
    setMilestones((ms as MilestoneItem[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const updateStatus = async (msId: string, status: string) => {
    setMilestones(prev => prev.map(m => m.id === msId ? { ...m, status: status as any, actual_date: status === 'completed' ? new Date().toISOString().split('T')[0] : m.actual_date } : m))
    await supabase.from('project_milestones').update({
      status,
      actual_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null,
      updated_at: new Date().toISOString(),
    }).eq('id', msId)
    // Update project progress
    const completed = milestones.filter(m => m.id === msId ? status === 'completed' : m.status === 'completed').length
    const progress = Math.round((completed / milestones.length) * 100)
    if (project) await supabase.from('projects').update({ progress }).eq('id', project.id)
  }

  const startEdit = (m: MilestoneItem) => {
    setEditing(m.id)
    setEditForm({ name: m.name, description: m.description ?? '', status: m.status, estimated_date: m.estimated_date ?? '', notes: m.notes ?? '' })
  }

  const saveEdit = async () => {
    if (!editing || saving) return
    setSaving(true)
    await supabase.from('project_milestones').update({
      name: editForm.name,
      description: editForm.description || null,
      status: editForm.status,
      estimated_date: editForm.estimated_date || null,
      notes: editForm.notes || null,
      actual_date: editForm.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
      updated_at: new Date().toISOString(),
    }).eq('id', editing)
    setEditing(null)
    setSaving(false)
    load()
  }

  const addMilestone = async () => {
    if (!addForm.name.trim() || saving) return
    setSaving(true)

    // Auto-create project if none exists
    let proj = project
    if (!proj) {
      const { data: newProj } = await supabase.from('projects').insert({
        client_id: id,
        name: 'Main Project',
        service_type: 'General',
        status: 'active',
        progress: 0,
      }).select().single()
      if (newProj) { proj = newProj as any; setProject(newProj as any) }
    }

    if (!proj) { setSaving(false); return }

    await supabase.from('project_milestones').insert({
      project_id: proj.id,
      client_id: id,
      name: addForm.name.trim(),
      description: addForm.description || null,
      status: 'pending',
      sort_order: milestones.length + 1,
    })
    setAddForm({ name: '', description: '' })
    setShowAdd(false)
    setSaving(false)
    load()
  }

  const deleteMilestone = async (msId: string) => {
    await supabase.from('project_milestones').delete().eq('id', msId)
    setMilestones(prev => prev.filter(m => m.id !== msId))
  }

  const completedCount = milestones.filter(m => m.status === 'completed').length
  const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Milestone className="w-4 h-4 text-blue-400" />
              {project?.name ?? 'Project Timeline'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{project?.service_type}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{progress}%</p>
            <p className="text-[10px] text-slate-500">{completedCount}/{milestones.length} completed</p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {milestones.map((m, i) => {
          const config = STATUS_CONFIG[m.status]
          const Icon = config.icon
          const isEditing = editing === m.id

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-4 mb-0"
            >
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center w-8 shrink-0">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${config.bg} ${config.border}`}>
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                {i < milestones.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${config.line}`} />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-6 ${i < milestones.length - 1 ? '' : ''}`}>
                {isEditing ? (
                  <div className="bg-white border border-blue-500/30 rounded-xl p-4 space-y-3">
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input-dark w-full" placeholder="Milestone name" />
                    <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="input-dark w-full resize-none" rows={2} placeholder="Description" />
                    <div className="flex gap-2">
                      <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className="input-dark flex-1">
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <input type="date" value={editForm.estimated_date} onChange={e => setEditForm(f => ({ ...f, estimated_date: e.target.value }))} className="input-dark flex-1" />
                    </div>
                    <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="input-dark w-full resize-none" rows={2} placeholder="Internal notes…" />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"><Save className="w-3 h-3" />Save</button>
                      <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-slate-400 text-xs hover:text-white">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-200 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">{m.name}</h3>
                        {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(m)} className="p-1 rounded-md hover:bg-slate-100 text-slate-500 hover:text-white"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => deleteMilestone(m.id)} className="p-1 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${config.bg} ${config.border} ${config.color}`}>
                        <Icon className="w-2.5 h-2.5" />{config.label}
                      </span>
                      {m.estimated_date && (
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />Target: {m.estimated_date}
                        </span>
                      )}
                      {m.actual_date && (
                        <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />Done: {m.actual_date}
                        </span>
                      )}
                    </div>
                    {m.notes && <p className="text-[11px] text-slate-600 mt-2 italic">{m.notes}</p>}
                    {/* Quick status buttons */}
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-200">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => updateStatus(m.id, key)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            m.status === key
                              ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                              : 'border-slate-200 text-slate-600 hover:text-slate-400 hover:border-slate-200'
                          }`}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Add milestone */}
      {showAdd ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Milestone name…" className="input-dark w-full" />
          <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className="input-dark w-full resize-none" />
          <div className="flex gap-2">
            <button onClick={addMilestone} disabled={saving || !addForm.name.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded-lg"><Plus className="w-3 h-3" />Add</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-slate-400 text-xs hover:text-white">Cancel</button>
          </div>
        </motion.div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:text-white hover:border-white/20 w-full justify-center transition-colors">
          <Plus className="w-4 h-4" />Add Milestone
        </button>
      )}
    </div>
  )
}
