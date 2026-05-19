'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, Building2, Shield, Mail, RefreshCw,
  Loader2, Send, Trash2, X, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useUserRole } from '@/lib/useUserRole'

/* ─── Types ─────────────────────────────────────────────────────── */
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

/* ─── Role access levels shown in the UI ────────────────────────── */
const ROLE_ACCESS: Record<string, { label: string; color: string }> = {
  'Founder':            { label: 'Full Access',    color: 'text-violet-400' },
  'Managing Director':  { label: 'Full Access',    color: 'text-blue-400' },
  'Head':               { label: 'Dept. Access',   color: 'text-emerald-400' },
  'Senior':             { label: 'Read + Write',   color: 'text-teal-400' },
  'Junior':             { label: 'Read + Limited', color: 'text-amber-400' },
  'Intern':             { label: 'Read Only',      color: 'text-slate-400' },
}

/* ─── Status badge ───────────────────────────────────────────────── */
const statusBadge: Record<string, string> = {
  active:   'badge badge-green',
  invited:  'badge badge-yellow',
  inactive: 'badge badge-slate',
}

/* ─── Remove Confirm Modal ───────────────────────────────────────── */
function RemoveModal({
  member,
  onConfirm,
  onCancel,
  loading,
}: {
  member: Member
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[99] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1628] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-white font-bold text-center text-lg mb-1">Remove Member?</h3>
        <p className="text-slate-400 text-sm text-center mb-1">
          <span className="text-white font-semibold">{member.name}</span> will lose all access immediately.
        </p>
        <p className="text-slate-600 text-xs text-center mb-6">{member.email}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Remove</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function TeamPage() {
  const { toast } = useToast()
  const { role_name, isAdmin } = useUserRole()

  // Only Founder, Managing Director, and platform admins can manage the team
  const canManage = isAdmin || role_name === 'Founder' || role_name === 'Managing Director'

  const [members, setMembers]         = useState<Member[]>([])
  const [loading, setLoading]         = useState(true)
  const [departments, setDepartments] = useState<any[]>([])
  const [showInvite, setShowInvite]   = useState(false)
  const [inviting, setInviting]       = useState(false)
  const [form, setForm]               = useState({ email: '', name: '', role_id: '' })
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)
  const [removing, setRemoving]       = useState(false)
  const [linkLoading, setLinkLoading] = useState<string | null>(null)

  /* Load members */
  async function load() {
    try {
      const res = await fetch('/api/team/members')
      const d = await res.json()
      setMembers(Array.isArray(d) ? d : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    fetch('/api/team/departments').then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {})
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, [])

  /* Send invite */
  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name, role_id: form.role_id || null }),
      })
      const d = await res.json()
      if (res.ok) {
        toast({ title: '✅ Invite sent!', description: d.message })
        setForm({ email: '', name: '', role_id: '' })
        setShowInvite(false)
        load()
      } else {
        toast({ variant: 'destructive', title: 'Error', description: d.error })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network error' })
    }
    setInviting(false)
  }

  /* Resend login link */
  async function sendLink(m: Member) {
    setLinkLoading(m.id)
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Pass role_id so the upsert never wipes the member's assigned role
        body: JSON.stringify({ email: m.email, name: m.name, role_id: m.role_id ?? null }),
      })
      const d = await res.json()
      toast(res.ok
        ? { title: '📧 Login link sent!', description: d.message }
        : { variant: 'destructive', title: 'Failed', description: d.error })
    } catch {
      toast({ variant: 'destructive', title: 'Network error' })
    }
    setLinkLoading(null)
  }

  /* Hard-delete member from DB */
  async function doRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const res = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: removeTarget.id }),
      })
      const d = await res.json()
      if (res.ok) {
        toast({ title: '✅ Removed', description: `${removeTarget.name} has been permanently removed.` })
        setRemoveTarget(null)
        load()
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: d.error })
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network error' })
    }
    setRemoving(false)
  }

  const active  = members.filter(m => m.status === 'active').length
  const invited = members.filter(m => m.status === 'invited').length
  const inputCls = 'w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500/60 transition-colors'

  return (
    <>
      {/* Remove modal */}
      <AnimatePresence>
        {removeTarget && (
          <RemoveModal
            member={removeTarget}
            onConfirm={doRemove}
            onCancel={() => setRemoveTarget(null)}
            loading={removing}
          />
        )}
      </AnimatePresence>

      <div className="px-6 py-8 max-w-[1400px] mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <h1 className="page-header">Team Management</h1>
            <p className="text-slate-400 text-sm mt-1">
              {active} active · {invited} pending invite · Invite-only platform access
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => setShowInvite(v => !v)}
              className="anx-gradient text-white font-semibold gap-2 h-10 px-5 rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-90"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          )}
        </motion.div>

        {/* ── Invite form ─────────────────────────────────────── */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">Invite New Member</h3>
                    <p className="text-slate-500 text-xs mt-0.5">
                      They'll receive an email with a <strong className="text-slate-300">set-password link</strong>.
                      After setting their password they can log in and access the platform based on their role.
                    </p>
                  </div>
                  <button onClick={() => setShowInvite(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={sendInvite} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">Full Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Junaid"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1.5 block">Email <span className="text-blue-400">*</span></label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="member@autonexai.org"
                        required
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Role & Department</label>
                    <select
                      value={form.role_id}
                      onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Select role...</option>
                      {departments.map((dept: any) =>
                        dept.roles?.length > 0 && (
                          <optgroup key={dept.id} label={`── ${dept.name}`}>
                            {dept.roles.map((role: any) => (
                              <option key={role.id} value={role.id}>
                                {role.name} · {ROLE_ACCESS[role.name]?.label || 'Custom Access'}
                              </option>
                            ))}
                          </optgroup>
                        )
                      )}
                    </select>
                    {departments.length === 0 && (
                      <p className="text-amber-400 text-xs mt-1">⚠ Run the SQL migration to load roles</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      type="submit"
                      disabled={inviting || !form.email}
                      className="anx-gradient text-white h-10 px-6 rounded-xl hover:opacity-90 disabled:opacity-50"
                    >
                      {inviting
                        ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                        : '📧 Send Invite →'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowInvite(false)}
                      className="text-slate-400 h-10 px-4 rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Info cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Building2, label: 'Departments', desc: 'Operations, Tech, Business + more', color: 'text-blue-400', border: 'border-blue-500/15', bg: 'bg-blue-500/10' },
            { icon: Shield, label: 'Role Access Levels', desc: 'Founder → Intern (6 levels)', color: 'text-violet-400', border: 'border-violet-500/15', bg: 'bg-violet-500/10' },
            { icon: Mail, label: 'Pending Invites', desc: `${invited} invite${invited !== 1 ? 's' : ''} awaiting acceptance`, color: 'text-amber-400', border: 'border-amber-500/15', bg: 'bg-amber-500/10' },
          ].map((c, i) => (
            <motion.div key={c.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`stat-card border ${c.border}`}
            >
              <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className={`font-semibold text-sm ${c.color}`}>{c.label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* ── Role reference ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 flex flex-wrap gap-x-6 gap-y-1"
        >
          <span className="text-slate-500 text-xs font-medium mr-2 self-center">Access levels:</span>
          {Object.entries(ROLE_ACCESS).map(([role, info]) => (
            <span key={role} className={`text-xs ${info.color}`}>
              <strong>{role}</strong> <span className="text-slate-600">({info.label})</span>
            </span>
          ))}
        </motion.div>

        {/* ── Members table ───────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-[#0d1a35]/60 overflow-hidden"
        >
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-white font-semibold text-sm">Team Members</h2>
              <p className="text-slate-500 text-xs">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={load} title="Refresh"
              className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Column labels */}
          <div className="hidden md:grid px-6 py-3 border-b border-white/5 text-[10px] text-slate-500 uppercase tracking-wider"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 1fr' }}>
            <span>Member</span>
            <span>Department</span>
            <span>Role</span>
            <span>Status</span>
            <span>Joined</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Users className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm">No members yet — invite someone above</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {members.map((m, i) => {
                const accessInfo = ROLE_ACCESS[m.role_name || '']
                return (
                  <motion.div key={m.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {/* Desktop row */}
                    <div
                      className="hidden md:grid items-center px-6 py-4 hover:bg-white/[0.02] transition-colors"
                      style={{ gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1fr 1fr' }}
                    >
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          m.status === 'invited'  ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                          : m.status === 'inactive' ? 'bg-white/5 border border-white/10 text-slate-500'
                          : 'bg-blue-500/10 border border-blue-500/25 text-blue-400'
                        }`}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${m.status === 'inactive' ? 'text-slate-500 line-through' : 'text-white'}`}>
                            {m.name}
                          </p>
                          <p className="text-slate-500 text-xs">{m.email}</p>
                        </div>
                      </div>

                      <span className="text-slate-400 text-xs">{m.department_name || '—'}</span>

                      <div>
                        <p className="text-slate-300 text-xs">{m.role_name || '—'}</p>
                        {accessInfo && (
                          <p className={`text-[10px] ${accessInfo.color}`}>{accessInfo.label}</p>
                        )}
                      </div>

                      <span className={statusBadge[m.status] || 'badge badge-slate'}>{m.status}</span>

                      <span className="text-slate-500 text-xs">
                        {m.joined_at ? format(new Date(m.joined_at), 'dd MMM yyyy') : '—'}
                      </span>

                      {/* ── ACTION BUTTONS — only for admins/founders/MD ── */}
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (
                          linkLoading === m.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                          ) : (
                            <>
                              <button
                                onClick={() => sendLink(m)}
                                title="Send login link"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                              >
                                <Send className="w-3 h-3" />
                                Login Link
                              </button>
                              <button
                                onClick={() => setRemoveTarget(m)}
                                title="Remove from team"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            </>
                          )
                        )}
                        {!canManage && (
                          <span className="text-slate-600 text-xs">View only</span>
                        )}
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div className="md:hidden px-5 py-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{m.name}</p>
                          <p className="text-slate-500 text-xs">{m.email}</p>
                        </div>
                        <span className={`ml-auto ${statusBadge[m.status]}`}>{m.status}</span>
                      </div>
                      {canManage && (
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => sendLink(m)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20">
                            <Send className="w-3 h-3" /> Login Link
                          </button>
                          <button onClick={() => setRemoveTarget(m)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white bg-red-600">
                            <Trash2 className="w-3 h-3" /> Remove
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

        <p className="text-slate-700 text-xs mt-4 text-center">
          🔒 Removed members lose access immediately · Re-invite anytime
        </p>
      </div>
    </>
  )
}
