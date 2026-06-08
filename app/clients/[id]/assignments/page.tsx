'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Plus, Trash2, Building2, Check, X, Search,
  Loader2, Shield, Crown, MessageSquare,
} from 'lucide-react'

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  head:   { label: 'Head',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  senior: { label: 'Senior', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  junior: { label: 'Junior', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  intern: { label: 'Intern', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
  member: { label: 'Member', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
}

interface TeamMembership {
  id: string
  role: string | null
  is_lead: boolean
  team_members: { id: string; name: string; email: string; roles?: { name: string } | null }
}

interface Team {
  id: string
  name: string
  color: string
  departments?: { name: string } | null
  team_memberships?: TeamMembership[]
}

interface Assignment {
  id: string
  brief: string | null
  assigned_by: string
  assigned_at: string
  teams: Team
}

export default function ClientAssignmentsPage() {
  const { id } = useParams<{ id: string }>()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [allTeams, setAllTeams]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showAssign, setShowAssign]   = useState(false)
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [brief, setBrief]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [search, setSearch]           = useState('')
  const [expanded, setExpanded]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [aRes, tRes] = await Promise.all([
      fetch(`/api/clients/${id}/assignments`),
      fetch('/api/teams'),
    ])
    const [aData, tData] = await Promise.all([aRes.json(), tRes.json()])
    setAssignments(Array.isArray(aData) ? aData : [])
    setAllTeams(Array.isArray(tData) ? tData : [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const assignedTeamIds = assignments.map(a => a.teams?.id).filter(Boolean)
  const availableTeams  = allTeams.filter(t =>
    !assignedTeamIds.includes(t.id) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) ||
     (t.departments?.name || '').toLowerCase().includes(search.toLowerCase()))
  )

  const toggleTeam = (tid: string) =>
    setSelectedTeams(prev => prev.includes(tid) ? prev.filter(x => x !== tid) : [...prev, tid])

  const handleAssign = async () => {
    if (!selectedTeams.length || saving) return
    setSaving(true)
    await fetch(`/api/clients/${id}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_ids: selectedTeams, brief }),
    })
    setSelectedTeams([]); setBrief(''); setShowAssign(false); setSaving(false); load()
  }

  const handleRemove = async (teamId: string) => {
    if (!confirm('Remove this team assignment? This will also remove them from all chat threads.')) return
    await fetch(`/api/clients/${id}/assignments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId }),
    })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Team Assignments
          <span className="text-xs text-slate-500 font-normal">({assignments.length} teams)</span>
        </h2>
        <button onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold shadow-sm transition-colors">
          <Plus className="w-3 h-3" /> Assign Teams
        </button>
      </div>

      {/* Current assignments */}
      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white border border-slate-200 rounded-xl">
          <Users className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 text-sm">No teams assigned yet</p>
          <button onClick={() => setShowAssign(true)} className="text-blue-600 text-xs hover:underline font-medium">
            Assign the first team
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, i) => {
            const members = a.teams?.team_memberships ?? []
            const head    = members.find(m => m.role === 'head' || m.is_lead)
            const isOpen  = expanded === a.id
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all">

                {/* Card header — click to expand */}
                <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : a.id)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (a.teams?.color || '#3b82f6') + '15', border: `1px solid ${a.teams?.color || '#3b82f6'}30` }}>
                    <Building2 className="w-4 h-4" style={{ color: a.teams?.color || '#3b82f6' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{a.teams?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>{(a.teams as any)?.departments?.name || 'No dept'}</span>
                      <span>·</span>
                      <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                      {head && <><span>·</span><span className="flex items-center gap-0.5"><Crown className="w-2.5 h-2.5 text-amber-500" />{head.team_members.name}</span></>}
                      <span>·</span>
                      <span>Assigned {new Date(a.assigned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>

                  {/* Avatars preview */}
                  <div className="flex -space-x-1.5 mr-2">
                    {members.slice(0, 4).map(m => (
                      <div key={m.id} title={`${m.team_members.name} (${m.role || 'member'})`}
                        className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-blue-700 shrink-0">
                        {m.team_members.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                        +{members.length - 4}
                      </div>
                    )}
                  </div>

                  <button onClick={e => { e.stopPropagation(); handleRemove(a.teams?.id) }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Expanded member list */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 overflow-hidden">
                      <div className="px-3 py-2 space-y-1.5">
                        {/* Thread info banner */}
                        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 mb-2">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          Chat threads auto-created: <span className="font-semibold">{a.teams?.name}</span> + <span className="font-semibold">Internal — {a.teams?.name}</span>
                        </div>

                        {members.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-2">No members in this team yet</p>
                        ) : (
                          members.map(m => {
                            const role = m.role || (m.is_lead ? 'head' : 'member')
                            const badge = ROLE_BADGE[role] ?? ROLE_BADGE.member
                            return (
                              <div key={m.id} className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  <span className="text-[9px] font-bold text-slate-600">{m.team_members.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">{m.team_members.name}</p>
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 border rounded-md font-medium flex items-center gap-0.5 ${badge.cls}`}>
                                  {role === 'head' && <Crown className="w-2 h-2" />}
                                  {badge.label}
                                </span>
                              </div>
                            )
                          })
                        )}
                        {a.brief && (
                          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 mt-1">📋 {a.brief}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAssign(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign Teams</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Chat threads auto-created for each team</p>
                </div>
                <button onClick={() => setShowAssign(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams…"
                    className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400" />
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                  {availableTeams.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400">No available teams</div>
                  ) : (
                    availableTeams.map(t => (
                      <button key={t.id} type="button" onClick={() => toggleTeam(t.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selectedTeams.includes(t.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${selectedTeams.includes(t.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {selectedTeams.includes(t.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: (t.color || '#3b82f6') + '15' }}>
                          <Building2 className="w-3 h-3" style={{ color: t.color || '#3b82f6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{t.name}</p>
                          <p className="text-[10px] text-slate-500">{t.departments?.name || 'No department'} · {t.team_memberships?.length ?? 0} members</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {selectedTeams.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Brief / Notes (optional)</label>
                    <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="What should these teams focus on…"
                      className="w-full h-16 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 resize-none" />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 px-5 pb-5">
                <button onClick={() => setShowAssign(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={handleAssign} disabled={!selectedTeams.length || saving}
                  className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning…</> : `Assign ${selectedTeams.length} Team${selectedTeams.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
