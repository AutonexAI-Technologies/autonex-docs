'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Building2, Shield, Mail, RefreshCw,
  Loader2, Send, Trash2, X, AlertTriangle, Plus, Crown,
  ChevronDown, ChevronRight, Briefcase, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useUserRole } from '@/lib/useUserRole'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string
  name: string
  email: string
  role_id?: string | null
  role_name?: string
  department_name?: string
  status: 'active' | 'invited' | 'inactive'
  joined_at?: string
}

interface TeamMembership {
  id: string
  is_lead: boolean
  team_members: { id: string; name: string; email: string; roles?: { name: string } | null }
}

interface Team {
  id: string
  name: string
  color: string
  description: string | null
  department_id: string | null
  departments?: { id: string; name: string } | null
  team_memberships: TeamMembership[]
  client_count?: number
}

const ROLE_ACCESS: Record<string, { label: string; color: string }> = {
  'Founder':           { label: 'Full Access',    color: 'text-violet-400' },
  'Managing Director': { label: 'Full Access',    color: 'text-blue-400'   },
  'Head':              { label: 'Dept. Access',   color: 'text-emerald-400' },
  'Senior':            { label: 'Read + Write',   color: 'text-teal-400'   },
  'Junior':            { label: 'Read + Limited', color: 'text-amber-400'  },
  'Intern':            { label: 'Read Only',      color: 'text-slate-400'  },
}
const statusBadge: Record<string, string> = {
  active: 'badge badge-green', invited: 'badge badge-yellow', inactive: 'badge badge-slate',
}
const TEAM_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#6366f1']

// ── Remove member modal ────────────────────────────────────────────────────────

function RemoveModal({ member, onConfirm, onCancel, loading }: {
  member: Member; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-slate-900 font-bold text-center text-lg mb-1">Remove Member?</h3>
        <p className="text-slate-500 text-sm text-center mb-1"><span className="text-slate-900 font-semibold">{member.name}</span> will lose all access immediately.</p>
        <p className="text-slate-400 text-xs text-center mb-6">{member.email}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" />Remove</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Role config ───────────────────────────────────────────────────────────────
const TEAM_ROLES = [
  { value: 'head',   label: 'Head',   color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-400' },
  { value: 'senior', label: 'Senior', color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-400' },
  { value: 'junior', label: 'Junior', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-400' },
  { value: 'intern', label: 'Intern', color: 'bg-slate-50 text-slate-600 border-slate-200',  dot: 'bg-slate-400' },
]

function getRoleBadge(role?: string | null, isLead?: boolean) {
  const r = role || (isLead ? 'head' : 'member')
  const cfg = TEAM_ROLES.find(x => x.value === r)
  if (!cfg) return null
  return (
    <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded-md shrink-0 font-medium ${cfg.color}`}>
      {r === 'head' && <Crown className="w-2.5 h-2.5" />}
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function getCapacityBadge(capacity?: { active_projects: number; status: string } | null) {
  if (!capacity) return null
  const { active_projects, status } = capacity
  const dot = status === 'available' ? 'bg-green-400' : status === 'busy' ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <span className="flex items-center gap-1 text-[10px] text-slate-400">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {active_projects} proj
    </span>
  )
}

// ── Team Card ──────────────────────────────────────────────────────────────────

function TeamCard({ team, allMembers, allClients, canManage, onDelete, onRefresh }: {
  team: Team
  allMembers: Member[]
  allClients: {id:string;name:string;company?:string}[]
  canManage: boolean
  onDelete: (id: string) => void
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [addingClient, setAddingClient] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('junior')
  const [saving, setSaving] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const { toast } = useToast()

  const memberIds = team.team_memberships.map(m => m.team_members.id)
  const available = allMembers.filter(m => !memberIds.includes(m.id))

  const addMember = async () => {
    if (!selectedMemberId || saving) return
    setSaving(true)
    const res = await fetch(`/api/teams/${team.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_member_id: selectedMemberId,
        role: selectedRole,
        is_lead: selectedRole === 'head',
      }),
    })
    if (res.ok) {
      onRefresh()
      setAddingMember(false)
      setSelectedMemberId('')
      setSelectedRole('junior')
      toast({ title: 'Member added', description: `Added as ${selectedRole}` })
    } else {
      const d = await res.json()
      toast({ variant: 'destructive', title: 'Error', description: d.error })
    }
    setSaving(false)
  }

  const assignClient = async () => {
    if (!selectedClientId || savingClient) return
    setSavingClient(true)
    const res = await fetch(`/api/clients/${selectedClientId}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_ids: [team.id] }),
    })
    if (res.ok) {
      onRefresh()
      setAddingClient(false)
      setSelectedClientId('')
      toast({ title: 'Client assigned!', description: `Team assigned to client. Chat threads created.` })
    } else {
      const d = await res.json()
      toast({ variant: 'destructive', title: 'Error', description: d.error })
    }
    setSavingClient(false)
  }

  const removeMember = async (memberId: string) => {
    await fetch(`/api/teams/${team.id}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_member_id: memberId }),
    })
    onRefresh()
  }

  return (
    <motion.div layout className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Team header */}
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: team.color + '18', border: `1.5px solid ${team.color}30` }}>
          <Building2 className="w-4 h-4" style={{ color: team.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{team.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span>{team.team_memberships.length} member{team.team_memberships.length !== 1 ? 's' : ''}</span>
            {team.client_count !== undefined && <><span>·</span><span>{team.client_count} client{team.client_count !== 1 ? 's' : ''}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <button onClick={e => { e.stopPropagation(); onDelete(team.id) }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded members */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 overflow-hidden">
            <div className="px-4 py-3 space-y-2">
              {team.team_memberships.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">No members yet</p>
              ) : (
                team.team_memberships.map(tm => (
                  <div key={tm.id} className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      <span className="text-blue-600 font-bold text-[10px]">{tm.team_members.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{tm.team_members.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{tm.team_members.email}</p>
                    </div>
                    {/* Role badge */}
                    {getRoleBadge((tm as any).role, tm.is_lead)}
                    {/* Capacity */}
                    {getCapacityBadge((tm.team_members as any).team_member_capacity?.[0] ?? null)}
                    {canManage && (
                      <button onClick={() => removeMember(tm.team_members.id)}
                        className="p-1 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}

              {/* Add member */}
              {canManage && (
                <AnimatePresence>
                  {addingMember ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 border-t border-slate-100 space-y-2">
                      <select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-400">
                        <option value="">Select member…</option>
                        {available.map(m => <option key={m.id} value={m.id}>{m.name} · {m.role_name || 'No role'}</option>)}
                      </select>
                      {/* Role picker */}
                      <div className="flex gap-1.5">
                        {TEAM_ROLES.map(r => (
                          <button key={r.value}
                            onClick={() => setSelectedRole(r.value)}
                            className={`flex-1 h-7 rounded-lg border text-[10px] font-semibold transition-all ${
                              selectedRole === r.value
                                ? r.color + ' border-current shadow-sm'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}>
                            {r.value === 'head' && '👑 '}{r.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addMember} disabled={!selectedMemberId || saving}
                          className="flex-1 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Add as {selectedRole}
                        </button>
                        <button onClick={() => { setAddingMember(false); setSelectedMemberId(''); setSelectedRole('junior') }}
                          className="px-3 h-7 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">Cancel</button>
                      </div>
                    </motion.div>
                  ) : (
                    <button onClick={() => setAddingMember(true)}
                      className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors mt-1">
                      <Plus className="w-3 h-3" />Add Member
                    </button>
                  )}
                </AnimatePresence>
              )}
              {/* Assign Client */}
              {canManage && (
                <AnimatePresence>
                  {addingClient ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 border-t border-slate-100 space-y-2">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Assign Client</p>
                      <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
                        className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-emerald-400">
                        <option value="">Select client…</option>
                        {allClients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={assignClient} disabled={!selectedClientId || savingClient}
                          className="flex-1 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1">
                          {savingClient ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Assign
                        </button>
                        <button onClick={() => { setAddingClient(false); setSelectedClientId('') }}
                          className="px-3 h-7 rounded-lg border border-slate-200 text-slate-500 text-xs hover:bg-slate-50">Cancel</button>
                      </div>
                    </motion.div>
                  ) : (
                    <button onClick={() => setAddingClient(true)}
                      className="w-full flex items-center justify-center gap-1.5 h-7 rounded-lg border border-dashed border-emerald-300 text-xs text-emerald-500 hover:text-emerald-700 hover:border-emerald-500 transition-colors">
                      <Plus className="w-3 h-3" />Assign Client
                    </button>
                  )}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { toast } = useToast()
  const { role_name, isAdmin } = useUserRole()
  const canManage = isAdmin || role_name === 'Founder' || role_name === 'Managing Director' || role_name === 'Head'

  const [members, setMembers]         = useState<Member[]>([])
  const [teams, setTeams]             = useState<Team[]>([])
  const [allClients, setAllClients]   = useState<{id:string;name:string;company?:string}[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [showInvite, setShowInvite]   = useState(false)
  const [showNewTeam, setShowNewTeam] = useState(false)
  const [inviting, setInviting]       = useState(false)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [form, setForm]               = useState({ email: '', name: '', role_id: '' })
  const [teamForm, setTeamForm]       = useState({ name: '', department_id: '', color: TEAM_COLORS[0], description: '' })
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving]       = useState(false)
  const [linkLoading, setLinkLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<'members' | 'teams'>('members')

  const loadMembers = useCallback(async () => {
    const res = await fetch('/api/team/members')
    const d = await res.json()
    setMembers(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true)
    const res = await fetch('/api/teams')
    const data = await res.json()
    if (Array.isArray(data)) setTeams(data) // client_count already included from API
    setTeamsLoading(false)
  }, [])

  useEffect(() => {
    loadMembers()
    loadTeams()
    fetch('/api/team/departments').then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/clients').then(r => r.json()).then(d => setAllClients(Array.isArray(d) ? d : [])).catch(() => {})
    const t = setInterval(loadMembers, 20_000)
    return () => clearInterval(t)
  }, [loadMembers, loadTeams])

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name, role_id: form.role_id || null }),
      })
      const d = await res.json()
      if (res.ok) { toast({ title: '✅ Invite sent!', description: d.message }); setForm({ email: '', name: '', role_id: '' }); setShowInvite(false); loadMembers() }
      else toast({ variant: 'destructive', title: 'Error', description: d.error })
    } catch { toast({ variant: 'destructive', title: 'Network error' }) }
    setInviting(false)
  }

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamForm.name.trim()) return
    setCreatingTeam(true)
    const res = await fetch('/api/teams', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamForm.name.trim(), department_id: teamForm.department_id || null, color: teamForm.color, description: teamForm.description || null }),
    })
    const d = await res.json()
    if (res.ok) { toast({ title: '✅ Team created!' }); setTeamForm({ name: '', department_id: '', color: TEAM_COLORS[0], description: '' }); setShowNewTeam(false); loadTeams() }
    else toast({ variant: 'destructive', title: 'Error', description: d.error })
    setCreatingTeam(false)
  }

  const deleteTeam = async (id: string) => {
    if (!confirm('Delete this team? All assignments will be removed.')) return
    await fetch('/api/teams', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadTeams()
  }

  const sendLink = async (m: Member) => {
    setLinkLoading(m.id)
    const res = await fetch('/api/team/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: m.email, name: m.name, role_id: m.role_id ?? null }) })
    const d = await res.json()
    toast(res.ok ? { title: '📧 Login link sent!', description: d.message } : { variant: 'destructive', title: 'Failed', description: d.error })
    setLinkLoading(null)
  }

  const doRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    const res = await fetch('/api/team/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: removeTarget.id }) })
    const d = await res.json()
    if (res.ok) { toast({ title: '✅ Removed', description: `${removeTarget.name} has been permanently removed.` }); setRemoveTarget(null); loadMembers() }
    else toast({ variant: 'destructive', title: 'Failed', description: d.error })
    setRemoving(false)
  }

  const active  = members.filter(m => m.status === 'active').length
  const invited = members.filter(m => m.status === 'invited').length
  const inputCls = 'w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 transition-colors'

  // Group teams by department
  const deptMap = new Map<string, { name: string; teams: Team[] }>()
  const unassigned: Team[] = []
  for (const t of teams) {
    if (t.department_id && t.departments?.name) {
      if (!deptMap.has(t.department_id)) deptMap.set(t.department_id, { name: t.departments.name, teams: [] })
      deptMap.get(t.department_id)!.teams.push(t)
    } else {
      unassigned.push(t)
    }
  }

  return (
    <>
      <AnimatePresence>
        {removeTarget && <RemoveModal member={removeTarget} onConfirm={doRemove} onCancel={() => setRemoveTarget(null)} loading={removing} />}
      </AnimatePresence>

      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="page-header">Team Management</h1>
            <p className="text-slate-500 text-sm mt-1">{active} active · {invited} pending · {teams.length} team{teams.length !== 1 ? 's' : ''}</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button onClick={() => { setShowNewTeam(v => !v); setShowInvite(false); setActiveTab('teams') }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 text-sm font-medium rounded-xl transition-colors">
                <Plus className="w-4 h-4" />New Team
              </button>
              <Button onClick={() => { setShowInvite(v => !v); setShowNewTeam(false); setActiveTab('members') }}
                className="anx-gradient text-white font-semibold gap-2 h-10 px-5 rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-90">
                <UserPlus className="w-4 h-4" />Invite Member
              </Button>
            </div>
          )}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Users, label: 'Active Members', value: active, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
            { icon: Mail, label: 'Pending Invites', value: invited, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            { icon: Briefcase, label: 'Teams Created', value: teams.length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
            { icon: Building2, label: 'Departments', value: deptMap.size, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`bg-white border ${s.border} rounded-2xl p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          {(['members', 'teams'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'members' ? '👥 Members' : '🏢 Teams'}
            </button>
          ))}
        </div>

        {/* ── INVITE FORM ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showInvite && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-slate-900 font-semibold">Invite New Member</h3>
                    <p className="text-slate-500 text-xs mt-0.5">They'll receive an email with login credentials immediately.</p>
                  </div>
                  <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={sendInvite} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 text-xs mb-1.5 block">Full Name</label>
                      <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Junaid" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-slate-600 text-xs mb-1.5 block">Email <span className="text-blue-600">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="member@autonexai.org" required className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-600 text-xs mb-1.5 block">Role & Department</label>
                    <select value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} className={inputCls}>
                      <option value="">Select role...</option>
                      {departments.map((dept: any) => dept.roles?.length > 0 && (
                        <optgroup key={dept.id} label={`── ${dept.name}`}>
                          {dept.roles.map((role: any) => (
                            <option key={role.id} value={role.id}>{role.name} · {ROLE_ACCESS[role.name]?.label || 'Custom'}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="submit" disabled={inviting || !form.email} className="anx-gradient text-white h-10 px-6 rounded-xl hover:opacity-90 disabled:opacity-50">
                      {inviting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : '📧 Send Invite →'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowInvite(false)} className="text-slate-500 h-10 px-4 rounded-xl">Cancel</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── NEW TEAM FORM ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showNewTeam && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-slate-900 font-semibold">Create New Team</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Give it a name and optionally link it to a department.</p>
                  </div>
                  <button onClick={() => setShowNewTeam(false)} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={createTeam} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 text-xs mb-1.5 block">Team Name <span className="text-blue-600">*</span></label>
                      <input type="text" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Design Squad Alpha" required className={inputCls} />
                    </div>
                    <div>
                      <label className="text-slate-600 text-xs mb-1.5 block">Department (optional)</label>
                      <select value={teamForm.department_id} onChange={e => setTeamForm(f => ({ ...f, department_id: e.target.value }))} className={inputCls}>
                        <option value="">No department</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-600 text-xs mb-1.5 block">Description (optional)</label>
                    <input type="text" value={teamForm.description} onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this team do?" className={inputCls} />
                  </div>
                  {/* Color picker */}
                  <div>
                    <label className="text-slate-600 text-xs mb-1.5 block">Team Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {TEAM_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setTeamForm(f => ({ ...f, color: c }))}
                          className={`w-7 h-7 rounded-lg border-2 transition-all ${teamForm.color === c ? 'scale-110 border-slate-900' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="submit" disabled={creatingTeam || !teamForm.name.trim()} className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-6 rounded-xl disabled:opacity-50">
                      {creatingTeam ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : '✅ Create Team'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowNewTeam(false)} className="text-slate-500 h-10 px-4 rounded-xl">Cancel</Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MEMBERS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-slate-900 font-semibold text-sm">Team Members</h2>
                <p className="text-slate-500 text-xs">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={loadMembers} className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="hidden md:grid px-6 py-3 border-b border-slate-100 text-[10px] text-slate-500 uppercase tracking-wider"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 1fr' }}>
              <span>Member</span><span>Department</span><span>Role</span><span>Status</span><span>Joined</span><span className="text-right">Actions</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Users className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-slate-400 text-sm">No members yet — invite someone above</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members.map((m, i) => {
                  const accessInfo = ROLE_ACCESS[m.role_name || '']
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                      <div className="hidden md:grid items-center px-6 py-4 hover:bg-slate-50 transition-colors" style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 1fr' }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            m.status === 'invited' ? 'bg-amber-50 border border-amber-200 text-amber-600'
                            : m.status === 'inactive' ? 'bg-slate-100 border border-slate-200 text-slate-400'
                            : 'bg-blue-50 border border-blue-200 text-blue-600'}`}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${m.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{m.name}</p>
                            <p className="text-slate-400 text-xs">{m.email}</p>
                          </div>
                        </div>
                        <span className="text-slate-500 text-xs">{m.department_name || '—'}</span>
                        <div>
                          <p className="text-slate-700 text-xs">{m.role_name || '—'}</p>
                          {accessInfo && <p className={`text-[10px] ${accessInfo.color}`}>{accessInfo.label}</p>}
                        </div>
                        <span className={statusBadge[m.status] || 'badge badge-slate'}>{m.status}</span>
                        <span className="text-slate-400 text-xs">{m.joined_at ? format(new Date(m.joined_at), 'dd MMM yyyy') : '—'}</span>
                        <div className="flex items-center justify-end gap-2">
                          {canManage && (linkLoading === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              <button onClick={() => sendLink(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors">
                                <Send className="w-3 h-3" />Login Link
                              </button>
                              <button onClick={() => setRemoveTarget(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
                                <Trash2 className="w-3 h-3" />Remove
                              </button>
                            </>
                          ))}
                          {!canManage && <span className="text-slate-400 text-xs">View only</span>}
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden px-5 py-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-sm">{m.name.charAt(0).toUpperCase()}</div>
                          <div><p className="text-slate-900 text-sm font-medium">{m.name}</p><p className="text-slate-400 text-xs">{m.email}</p></div>
                          <span className={`ml-auto ${statusBadge[m.status]}`}>{m.status}</span>
                        </div>
                        {canManage && (
                          <div className="flex gap-2">
                            <button onClick={() => sendLink(m)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200">
                              <Send className="w-3 h-3" />Login Link
                            </button>
                            <button onClick={() => setRemoveTarget(m)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white bg-red-500">
                              <Trash2 className="w-3 h-3" />Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── TEAMS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'teams' && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {teamsLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <Building2 className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No teams yet</p>
                {canManage && <button onClick={() => setShowNewTeam(true)} className="mt-2 text-blue-600 text-xs hover:underline">Create your first team</button>}
              </div>
            ) : (
              <>
                {/* Department groups */}
                {Array.from(deptMap.entries()).map(([deptId, { name, teams: deptTeams }]) => (
                  <div key={deptId}>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-700">{name}</h3>
                      <span className="text-xs text-slate-400">({deptTeams.length} team{deptTeams.length !== 1 ? 's' : ''})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deptTeams.map(t => (
                        <TeamCard key={t.id} team={t} allMembers={members} allClients={allClients} canManage={canManage} onDelete={deleteTeam} onRefresh={loadTeams} />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Unassigned teams */}
                {unassigned.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-700">Other Teams</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {unassigned.map(t => (
                        <TeamCard key={t.id} team={t} allMembers={members} allClients={allClients} canManage={canManage} onDelete={deleteTeam} onRefresh={loadTeams} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        <p className="text-slate-400 text-xs mt-6 text-center">🔒 Removed members lose access immediately · Re-invite anytime</p>
      </div>
    </>
  )
}
