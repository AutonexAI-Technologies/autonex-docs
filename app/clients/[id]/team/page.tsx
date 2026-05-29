'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Users, Plus, Trash2, Mail, Phone, Shield,
  Copy, Check, Loader2, Send, ExternalLink
} from 'lucide-react'

interface PortalUser {
  id: string
  name: string
  email: string
  phone: string | null
  portal_role: string
  created_at: string
}
interface Invite {
  id: string
  email: string
  portal_role: string
  token: string
  accepted: boolean
  expires_at: string
  created_at: string
}

const ROLE_COLOR: Record<string, string> = {
  client_admin:   'text-violet-700 bg-violet-50 border-violet-200',
  client_manager: 'text-blue-700 bg-blue-50 border-blue-200',
  client_viewer:  'text-slate-600 bg-slate-50 border-slate-200',
}
const ROLE_LABEL: Record<string, string> = {
  client_admin: 'Admin',
  client_manager: 'Manager',
  client_viewer: 'Viewer',
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [users, setUsers] = useState<PortalUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', portal_role: 'client_viewer' })
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: pu }, { data: inv }] = await Promise.all([
      supabase.from('portal_users').select('*').eq('client_id', id).order('created_at'),
      supabase.from('portal_invites').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])
    setUsers((pu as PortalUser[]) ?? [])
    setInvites((inv as Invite[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const sendInvite = async () => {
    if (!inviteForm.email.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: id,
          email: inviteForm.email.trim(),
          portal_role: inviteForm.portal_role,
        }),
      })
      if (res.ok) {
        setInviteForm({ email: '', portal_role: 'client_viewer' })
        setShowInvite(false)
        load()
      }
    } catch {}
    setSending(false)
  }

  const copyLink = (token: string) => {
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3002'
    const url = `${portalUrl}/invite/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const deleteInvite = async (invId: string) => {
    await supabase.from('portal_invites').delete().eq('id', invId)
    setInvites(prev => prev.filter(i => i.id !== invId))
  }

  const removeUser = async (userId: string) => {
    await supabase.from('portal_users').delete().eq('id', userId)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Portal Users */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Portal Users
            <span className="text-xs text-slate-500 font-normal">({users.length})</span>
          </h2>
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-semibold shadow-sm">
            <Plus className="w-3 h-3" />Invite
          </button>
        </div>

        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 text-sm">No portal users yet</p>
            <button onClick={() => setShowInvite(true)} className="text-blue-600 text-xs hover:underline font-medium">Send the first invite</button>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">{u.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{u.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <Mail className="w-2.5 h-2.5" /><span>{u.email}</span>
                    {u.phone && <><Phone className="w-2.5 h-2.5 ml-1" /><span>{u.phone}</span></>}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium ${ROLE_COLOR[u.portal_role] ?? ROLE_COLOR.client_viewer}`}>
                  {ROLE_LABEL[u.portal_role] ?? u.portal_role}
                </span>
                <button onClick={() => removeUser(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Invite form */}
      {showInvite && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-blue-200 rounded-xl p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Send className="w-3.5 h-3.5 text-blue-600" />Send Portal Invite</p>
          <p className="text-xs text-slate-500">Credentials (email + auto-generated password) will be sent to the client directly.</p>
          <div className="flex gap-2">
            <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address…" type="email" className="input-dark flex-1" />
            <select value={inviteForm.portal_role} onChange={e => setInviteForm(f => ({ ...f, portal_role: e.target.value }))} className="input-dark w-36">
              <option value="client_viewer">Viewer</option>
              <option value="client_manager">Manager</option>
              <option value="client_admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={sendInvite} disabled={!inviteForm.email.trim() || sending} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs rounded-lg font-semibold shadow-sm">
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}Send Credentials
            </button>
            <button onClick={() => setShowInvite(false)} className="px-3 py-2 text-slate-500 text-xs hover:text-slate-700">Cancel</button>
          </div>
        </motion.div>
      )}

      {/* Pending invites */}
      {invites.filter(i => !i.accepted).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 mb-3">Pending Invites</h3>
          <div className="space-y-2">
            {invites.filter(i => !i.accepted).map((inv, i) => {
              const expired = new Date(inv.expires_at) < new Date()
              return (
                <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${expired ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}
                >
                  <Mail className={`w-4 h-4 ${expired ? 'text-red-500' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{inv.email}</p>
                    <p className="text-[10px] text-slate-500">
                      {expired ? 'Expired' : `Expires ${new Date(inv.expires_at).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium ${ROLE_COLOR[inv.portal_role] ?? ROLE_COLOR.client_viewer}`}>
                    {ROLE_LABEL[inv.portal_role] ?? inv.portal_role}
                  </span>
                  <button onClick={() => copyLink(inv.token)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Copy invite link">
                    {copied === inv.token ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button onClick={() => deleteInvite(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
