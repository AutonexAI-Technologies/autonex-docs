'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  Users, Briefcase, FileText, CheckCircle2, Clock,
  AlertCircle, Plus, ExternalLink, MoreHorizontal,
  TrendingUp, Zap, Eye, Building2, Trash2
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type PipelineStatus =
  | 'lead'
  | 'proposal_sent'
  | 'contract_signed'
  | 'active'
  | 'review'
  | 'completed'
  | 'paused'

interface PipelineClient {
  id: string
  name: string
  company: string
  service_type: string
  status: PipelineStatus
  email: string
  phone?: string
  created_at: string
  invoice_status?: string
}

// ── Column Config ─────────────────────────────────────────────────────────────

const COLUMNS: {
  key: PipelineStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  border: string
}[] = [
  {
    key: 'lead',
    label: 'Lead',
    icon: Users,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
  {
    key: 'proposal_sent',
    label: 'Proposal Sent',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  {
    key: 'contract_signed',
    label: 'Contract Signed',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    key: 'active',
    label: 'Active',
    icon: Zap,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    key: 'review',
    label: 'In Review',
    icon: Eye,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: TrendingUp,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
]

// ── Utility ───────────────────────────────────────────────────────────────────

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

// ── Card Component ────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onDragStart,
  onDelete,
}: {
  client: PipelineClient
  onDragStart: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={() => onDragStart(client.id)}
      className="group bg-white border border-slate-200 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all duration-200 hover:shadow-md shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-white">
              {serviceInitials(client.service_type || 'CU')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 truncate leading-tight">
              {client.name}
            </p>
            {client.company && (
              <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5 shrink-0" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/clients/${client.id}`}
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-blue-50"
        >
          <ExternalLink className="w-3 h-3 text-blue-500" />
        </Link>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(client.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500"
          title="Delete client"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Service badge */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="badge badge-blue text-[10px]">
          {client.service_type || 'Custom'}
        </span>
        {client.invoice_status === 'overdue' && (
          <span className="badge badge-red text-[10px]">Overdue</span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{timeAgo(client.created_at)}</span>
        <span className="text-[10px] text-slate-400">{client.email}</span>
      </div>
    </motion.div>
  )
}

// ── Column Component ──────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  clients,
  onDragStart,
  onDrop,
  isOver,
  onDragOver,
  onDelete,
}: {
  col: typeof COLUMNS[0]
  clients: PipelineClient[]
  onDragStart: (id: string) => void
  onDrop: (status: PipelineStatus) => void
  isOver: boolean
  onDragOver: () => void
  onDelete: (id: string) => void
}) {
  const Icon = col.icon

  return (
    <div
      className={`flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-2xl border transition-all duration-200 ${
        isOver
          ? 'border-blue-400 bg-blue-50/50 shadow-lg shadow-blue-100'
          : 'border-slate-200 bg-white'
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDrop={(e) => { e.preventDefault(); onDrop(col.key) }}
    >
      {/* Column header */}
      <div className="px-3.5 py-3 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md ${col.bg} border ${col.border} flex items-center justify-center`}>
            <Icon className={`w-3 h-3 ${col.color}`} />
          </div>
          <span className="text-sm font-semibold text-slate-900">{col.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bg} ${col.color}`}>
          {clients.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2.5 min-h-[120px] overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-thin">
        <AnimatePresence>
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onDragStart={onDragStart} onDelete={onDelete} />
          ))}
        </AnimatePresence>

        {clients.length === 0 && (
          <div className="h-20 flex items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
            <p className="text-[11px] text-slate-400">Drop here</p>
          </div>
        )}
      </div>
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
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('id, name, company, service_type, status, email, phone, created_at')
      .order('created_at', { ascending: false })
    setClients((data as PipelineClient[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleDrop = async (newStatus: PipelineStatus) => {
    if (!draggingId || saving) return
    const prevClients = clients
    setClients(prev =>
      prev.map(c => c.id === draggingId ? { ...c, status: newStatus } : c)
    )
    setDraggingId(null)
    setOverColumn(null)
    setSaving(true)
    const { error } = await supabase
      .from('clients')
      .update({ status: newStatus })
      .eq('id', draggingId)
    if (error) setClients(prevClients)
    setSaving(false)
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Delete this client permanently? This cannot be undone.')) return
    setClients(prev => prev.filter(c => c.id !== clientId))
    await supabase.from('clients').delete().eq('id', clientId)
  }

  const grouped = COLUMNS.reduce<Record<PipelineStatus, PipelineClient[]>>(
    (acc, col) => {
      acc[col.key] = clients.filter(c => {
        if (col.key === 'active') {
          return c.status === 'active' || (c.status as string) === 'onboarding'
        }
        return c.status === col.key
      })
      return acc
    },
    {} as Record<PipelineStatus, PipelineClient[]>
  )

  const totals = {
    total: clients.length,
    active: grouped['active']?.length ?? 0,
    lead: grouped['lead']?.length ?? 0,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Pipeline
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Drag clients between stages to update their status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{totals.total}</p>
                <p className="text-[10px] text-slate-500">Total</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">{totals.active}</p>
                <p className="text-[10px] text-slate-500">Active</p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <p className="text-lg font-bold text-slate-500">{totals.lead}</p>
                <p className="text-[10px] text-slate-500">Leads</p>
              </div>
            </div>
            <Link
              href="/clients/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Link>
          </div>
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-600 font-medium">
          Saving…
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.key}
                col={col}
                clients={grouped[col.key] ?? []}
                onDragStart={(id) => setDraggingId(id)}
                onDrop={handleDrop}
                isOver={overColumn === col.key}
                onDragOver={() => setOverColumn(col.key)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
