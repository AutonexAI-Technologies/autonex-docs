'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  Users, Briefcase, FileText, CheckCircle2,
  TrendingUp, Zap, Eye, Building2,
  Plus, ExternalLink, X, Search, ChevronDown, Filter,
} from 'lucide-react'
import { useUserRole } from '@/lib/useUserRole'

// ── Types ─────────────────────────────────────────────────────────────────────

type PipelineStatus =
  | 'lead' | 'proposal_sent' | 'contract_signed'
  | 'active' | 'review' | 'completed'

interface PipelineClient {
  id: string
  name: string
  company: string
  service_type: string
  status: PipelineStatus
  email: string
  phone?: string
  created_at: string
}

// ── Column Config ─────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'lead' as PipelineStatus, label: 'Lead', icon: Users, accent: '#6E6E73', accentBg: 'rgba(110,110,115,0.1)' },
  { key: 'proposal_sent' as PipelineStatus, label: 'Proposal Sent', icon: FileText, accent: '#5856D6', accentBg: 'rgba(88,86,214,0.1)' },
  { key: 'contract_signed' as PipelineStatus, label: 'Contract Signed', icon: CheckCircle2, accent: '#0071E3', accentBg: 'rgba(0,113,227,0.1)' },
  { key: 'active' as PipelineStatus, label: 'Active', icon: Zap, accent: '#30D158', accentBg: 'rgba(48,209,88,0.1)' },
  { key: 'review' as PipelineStatus, label: 'In Review', icon: Eye, accent: '#FF9F0A', accentBg: 'rgba(255,159,10,0.1)' },
  { key: 'completed' as PipelineStatus, label: 'Completed', icon: TrendingUp, accent: '#34AADC', accentBg: 'rgba(52,170,220,0.1)' },
]

function serviceInitials(service: string) {
  return service.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({ client, onDragStart, onDelete, viewOnly }: {
  client: PipelineClient
  onDragStart: (id: string) => void
  onDelete: (id: string) => void
  viewOnly: boolean
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable={!viewOnly}
      onDragStart={() => !viewOnly && onDragStart(client.id)}
      className="card p-3.5"
      style={{
        cursor: viewOnly ? 'default' : 'grab',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = '' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
            <span className="text-[9px] font-bold" style={{ color: 'var(--accent)' }}>{serviceInitials(client.service_type || 'CU')}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
            {client.company && (
              <p className="text-[10px] truncate flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Building2 className="w-2.5 h-2.5 shrink-0" />{client.company}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Link href={`/clients/${client.id}`} onClick={e => e.stopPropagation()}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'var(--accent)' }}
            onMouseEnter={(e: any) => e.currentTarget.style.background = 'var(--accent-light)'}
            onMouseLeave={(e: any) => e.currentTarget.style.background = 'transparent'}>
            <ExternalLink className="w-3 h-3" />
          </Link>
          {!viewOnly && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(client.id) }}
              title="Remove from pipeline"
              className="p-1 rounded-md transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e: any) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'var(--error-bg)' }}
              onMouseLeave={(e: any) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="badge badge-blue">{client.service_type || 'Custom'}</span>
      </div>
      <div className="mt-2.5 pt-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(client.created_at)}</span>
        <span className="text-[10px] truncate max-w-[120px]" style={{ color: 'var(--text-tertiary)' }}>{client.email}</span>
      </div>
    </motion.div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({ col, clients, onDragStart, onDrop, isOver, onDragOver, onDelete, viewOnly }: {
  col: typeof COLUMNS[0]
  clients: PipelineClient[]
  onDragStart: (id: string) => void
  onDrop: (status: PipelineStatus) => void
  isOver: boolean
  onDragOver: () => void
  onDelete: (id: string) => void
  viewOnly: boolean
}) {
  const Icon = col.icon
  return (
    <div
      className="flex flex-col min-w-[256px] w-[256px] shrink-0 rounded-xl overflow-hidden"
      style={{
        border: isOver && !viewOnly ? `2px solid ${col.accent}` : '1px solid var(--border)',
        background: isOver && !viewOnly ? col.accentBg : 'var(--surface-2)',
        boxShadow: isOver && !viewOnly ? `0 4px 24px ${col.accent}22` : 'none',
        transition: 'all 0.15s',
      }}
      onDragOver={e => { if (!viewOnly) { e.preventDefault(); onDragOver() } }}
      onDrop={e => { if (!viewOnly) { e.preventDefault(); onDrop(col.key) } }}
    >
      <div className="px-3.5 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: col.accentBg }}>
            <Icon className="w-3 h-3" style={{ color: col.accent }} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{col.label}</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: col.accentBg, color: col.accent }}>
          {clients.length}
        </span>
      </div>
      <div className="flex-1 p-2.5 space-y-2.5 min-h-[120px] overflow-y-auto max-h-[calc(100vh-190px)] scrollbar-thin">
        <AnimatePresence>
          {clients.map(c => (
            <ClientCard key={c.id} client={c} onDragStart={onDragStart} onDelete={onDelete} viewOnly={viewOnly} />
          ))}
        </AnimatePresence>
        {clients.length === 0 && (
          <div className="h-20 flex items-center justify-center rounded-lg" style={{ border: '1.5px dashed var(--border-strong)' }}>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{viewOnly ? 'No clients' : 'Drop here'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Move to Pipeline Modal ────────────────────────────────────────────────────

function MoveToStageModal({ allClients, onClose, onMove }: {
  allClients: PipelineClient[]
  onClose: () => void
  onMove: (clientId: string, stage: PipelineStatus) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<PipelineClient | null>(null)
  const [selectedStage, setSelectedStage] = useState<PipelineStatus>('lead')
  const [stageOpen, setStageOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const filtered = allClients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )
  const selectedCol = COLUMNS.find(c => c.key === selectedStage)!

  async function handleMove() {
    if (!selectedClient) return
    setMoving(true)
    await onMove(selectedClient.id, selectedStage)
    setMoving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Move Client to Stage</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a client and assign a stage</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Select Client</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, company or email…"
                className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-400" />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-400">No clients found</div>
              ) : filtered.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedClient(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selectedClient?.id === c.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-slate-50'}`}>
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-white">{serviceInitials(c.service_type || 'CU')}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.company || c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Assign to Stage</label>
            <div className="relative">
              <button type="button" onClick={() => setStageOpen(!stageOpen)}
                className="w-full flex items-center justify-between h-10 px-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 text-sm text-slate-900">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-md ${selectedCol.bg} border ${selectedCol.border} flex items-center justify-center`}>
                    <selectedCol.icon className={`w-2.5 h-2.5 ${selectedCol.color}`} />
                  </span>
                  {selectedCol.label}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${stageOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {stageOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute top-[calc(100%+4px)] left-0 right-0 z-10 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    {COLUMNS.map(col => (
                      <button key={col.key} type="button" onClick={() => { setSelectedStage(col.key); setStageOpen(false) }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${selectedStage === col.key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}>
                        <span className={`w-5 h-5 rounded-md ${col.bg} border ${col.border} flex items-center justify-center`}>
                          <col.icon className={`w-2.5 h-2.5 ${col.color}`} />
                        </span>
                        {col.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button onClick={handleMove} disabled={!selectedClient || moving}
            className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
            {moving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Moving…</> : `Move to ${selectedCol.label} →`}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [clients, setClients] = useState<PipelineClient[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<PipelineStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [myTeamOnly, setMyTeamOnly] = useState(false)
  const [myTeamClientIds, setMyTeamClientIds] = useState<string[]>([])
  const supabase = createClient()
  const { role_name, isAdmin } = useUserRole()

  // Intern = view only, no drag/drop/delete
  const isIntern = role_name === 'Intern'
  const isJunior = role_name === 'Junior'
  const needsTeamFilter = (isIntern || isJunior) && !isAdmin
  const viewOnly = isIntern

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('id, name, company, service_type, status, email, phone, created_at')
      .order('created_at', { ascending: false })
    setClients((data as PipelineClient[]) ?? [])
    setLoading(false)
  }, [supabase])

  // Load team-assigned client IDs for Juniors/Interns
  const loadMyTeamClients = useCallback(async () => {
    if (!needsTeamFilter) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    // Get this member's team memberships → assignments → client ids
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id, team_members!inner(email)')
      .eq('team_members.email', user.email.toLowerCase())
    const teamIds = (memberships ?? []).map((m: any) => m.team_id)
    if (!teamIds.length) { setMyTeamClientIds([]); return }
    const { data: assignments } = await supabase
      .from('client_assignments')
      .select('client_id')
      .in('team_id', teamIds)
    setMyTeamClientIds((assignments ?? []).map((a: any) => a.client_id))
  }, [supabase, needsTeamFilter])

  useEffect(() => { load(); loadMyTeamClients() }, [load, loadMyTeamClients])
  // Default to team filter for Juniors/Interns
  useEffect(() => { if (needsTeamFilter) setMyTeamOnly(true) }, [needsTeamFilter])

  const handleDrop = async (newStatus: PipelineStatus) => {
    if (!draggingId || saving || viewOnly) return
    const prev = clients
    const movedClient = clients.find(c => c.id === draggingId)
    setClients(p => p.map(c => c.id === draggingId ? { ...c, status: newStatus } : c))
    setDraggingId(null); setOverColumn(null); setSaving(true)
    const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', draggingId)
    if (error) { setClients(prev) }
    else if (movedClient) {
      const stageName = COLUMNS.find(c => c.key === newStatus)?.label ?? newStatus
      try {
        await supabase.from('notifications').insert({
          title: 'Pipeline Stage Updated',
          message: `${movedClient.name} moved to ${stageName}`,
          type: 'success', read: false,
        })
        await supabase.from('activity_logs').insert({
          user_name: 'Team',
          action: `moved to ${stageName}`,
          entity_type: 'client',
          entity_id: movedClient.id,
          entity_name: movedClient.name,
          metadata: { from: movedClient.status, to: newStatus },
        })
      } catch {}
    }
    setSaving(false)
  }

  // Remove from pipeline only — does NOT delete the client from the CRM.
  // Client stays in the Clients list and can be re-added to the pipeline at any time.
  const handleDelete = async (clientId: string) => {
    if (viewOnly) return
    if (!confirm('Remove this client from the pipeline? The client record will NOT be deleted — they can be re-added any time.')) return
    setClients(prev => prev.filter(c => c.id !== clientId))
    await supabase.from('clients').update({ status: null }).eq('id', clientId)
  }

  const handleMoveToStage = async (clientId: string, stage: PipelineStatus) => {
    setSaving(true)
    const movedClient = clients.find(c => c.id === clientId)
    const { error } = await supabase.from('clients').update({ status: stage }).eq('id', clientId)
    if (!error) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: stage } : c))
      if (movedClient) {
        const stageName = COLUMNS.find(c => c.key === stage)?.label ?? stage
        try {
          await supabase.from('notifications').insert({
            title: 'Pipeline Stage Updated',
            message: `${movedClient.name} moved to ${stageName}`,
            type: 'success', read: false,
          })
          await supabase.from('activity_logs').insert({
            user_name: 'Team',
            action: `moved to ${stageName}`,
            entity_type: 'client',
            entity_id: movedClient.id,
            entity_name: movedClient.name,
            metadata: { from: movedClient.status, to: stage },
          })
        } catch {}
      }
    }
    setSaving(false)
  }

  // Filter clients based on myTeamOnly toggle
  const displayClients = myTeamOnly
    ? clients.filter(c => myTeamClientIds.includes(c.id))
    : clients

  const grouped = COLUMNS.reduce<Record<PipelineStatus, PipelineClient[]>>(
    (acc, col) => {
      acc[col.key] = displayClients.filter(c => {
        if (col.key === 'active') return c.status === 'active' || (c.status as string) === 'onboarding'
        return c.status === col.key
      })
      return acc
    }, {} as Record<PipelineStatus, PipelineClient[]>
  )

  const totals = { total: displayClients.length, active: grouped['active']?.length ?? 0, lead: grouped['lead']?.length ?? 0 }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-[20px] font-bold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              <Briefcase className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              Pipeline
              {viewOnly && <span className="badge badge-yellow">View Only</span>}
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {viewOnly ? 'Track project stages' : 'Drag clients between stages · use Move to Stage for quick assignment'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-4 pr-4" style={{ borderRight: '1px solid var(--border)' }}>
              <div className="text-center">
                <p className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>{totals.total}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Total</p>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold" style={{ color: '#30D158' }}>{totals.active}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Active</p>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold" style={{ color: 'var(--text-secondary)' }}>{totals.lead}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Leads</p>
              </div>
            </div>
            <button onClick={() => setMyTeamOnly(!myTeamOnly)}
              className="btn btn-sm gap-1.5"
              style={myTeamOnly ? { background: 'var(--accent)', color: '#fff', border: 'none' } : {}}>
              <Filter className="w-3.5 h-3.5" /> My Team
            </button>
            {!viewOnly && (
              <>
                <button onClick={() => setShowMoveModal(true)} className="btn btn-secondary btn-sm gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Move to Stage
                </button>
                <Link href="/clients/new"><button className="btn btn-primary btn-sm gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Client</button></Link>
              </>
            )}
          </div>
        </div>
      </div>

      {saving && <div className="px-6 py-2 text-[12px] font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)', borderBottom: '1px solid rgba(0,113,227,0.15)' }}>Saving…</div>}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="spinner" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map(col => (
              <KanbanColumn key={col.key} col={col} clients={grouped[col.key] ?? []}
                onDragStart={id => setDraggingId(id)} onDrop={handleDrop}
                isOver={overColumn === col.key} onDragOver={() => setOverColumn(col.key)}
                onDelete={handleDelete} viewOnly={viewOnly} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showMoveModal && (
          <MoveToStageModal allClients={clients} onClose={() => setShowMoveModal(false)} onMove={handleMoveToStage} />
        )}
      </AnimatePresence>
    </div>
  )
}
