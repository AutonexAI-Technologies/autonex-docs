'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Plus, Search, Users, ArrowRight, Loader2,
  Trash2, Mail, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Client, ClientStatus } from '@/types'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { useUserRole } from '@/lib/useUserRole'
import { getPermissions } from '@/lib/roleAccess'

const STATUSES: ClientStatus[] = ['Lead', 'Active', 'Completed', 'On Hold', 'Cancelled']

const statusStyles: Record<ClientStatus, string> = {
  Lead: 'badge badge-violet',
  Active: 'badge badge-green',
  Completed: 'badge badge-blue',
  'On Hold': 'badge badge-yellow',
  Cancelled: 'badge badge-red',
}

export default function ClientsPage() {
  const { toast } = useToast()
  const { role_name, isAdmin } = useUserRole()
  const perms = getPermissions(isAdmin ? null : role_name)

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'All'>('All')
  const [filterOpen, setFilterOpen] = useState(false)

  async function loadClients() {
    setLoading(true)
    const res = await fetch('/api/clients')
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Soft-delete client "${name}"? They can be recovered by the Founder.`)) return
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: '🗑️ Client deleted', description: `${name} moved to archive.` })
      loadClients()
    } else {
      toast({ variant: 'destructive', title: 'Delete failed' })
    }
  }

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || (c.status || 'Lead').toLowerCase() === statusFilter.toLowerCase()
    return matchSearch && matchStatus
  })

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4 mb-8"
      >
        <div>
          <h1 className="page-header">Client Management</h1>
          <p className="text-slate-400 text-sm mt-1">
            {clients.length} clients total · {clients.filter(c => c.status === 'Active').length} active
          </p>
        </div>
        {perms.canCreateClient && (
          <Link href="/clients/new">
            <Button className="anx-gradient text-white font-semibold gap-2 h-10 px-5 rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" />
              Add Client
            </Button>
          </Link>
        )}
      </motion.div>

      {/* Status filter pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 flex-wrap mb-5"
      >
        {(['All', ...STATUSES] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              statusFilter === s
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            {s}
            {s !== 'All' && (
              <span className="ml-1.5 opacity-60">
                {clients.filter(c => (c.status || 'Lead').toLowerCase() === s.toLowerCase()).length}
              </span>
            )}
          </button>
        ))}

        <div className="ml-auto relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search by name, email, company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-64 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm rounded-xl focus:border-blue-500/50"
            />
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-white/5 bg-[#0d1a35]/60 overflow-hidden"
      >
        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
          <span>Client</span>
          <span>Service</span>
          <span>Status</span>
          <span>Project Type</span>
          <span>Revenue</span>
          <span className="w-16" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-white font-medium">No clients found</p>
            <p className="text-slate-500 text-sm mt-1">
              {search ? 'Try a different search term' : 'Add your first client to get started'}
            </p>
            {!search && (
              <Link href="/clients/new">
                <Button className="mt-4 anx-gradient text-white text-sm font-medium gap-2 px-4 py-2 rounded-xl hover:opacity-90">
                  <Plus className="w-4 h-4" />
                  Add First Client
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="group"
              >
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  {/* Client info */}
                  <Link href={`/clients/${client.id}`} className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0 text-blue-400 font-bold text-sm">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{client.name}</p>
                      <p className="text-slate-500 text-xs truncate flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5 shrink-0" />
                        {client.email}
                      </p>
                      {client.company && (
                        <p className="text-slate-600 text-xs truncate flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5 shrink-0" />
                          {client.company}
                        </p>
                      )}
                    </div>
                  </Link>

                  <span className="hidden md:block text-slate-400 text-xs truncate max-w-[180px]">{client.service}</span>

                  <span className={`hidden md:inline-flex ${statusStyles[client.status as ClientStatus] || 'badge badge-slate'}`}>
                    {client.status || 'Lead'}
                  </span>

                  <span className={`hidden md:block text-xs font-medium ${client.project_type === 'retainer' ? 'text-violet-400' : 'text-slate-400'}`}>
                    {client.project_type === 'retainer' ? '🔄 Retainer' : '⚡ One-time'}
                  </span>

                  <span className="hidden md:block text-white font-semibold text-sm">
                    ₹{(client.total_fee || 0).toLocaleString('en-IN')}
                  </span>

                  {/* Actions — only shown for roles with delete permission */}
                  {perms.canDeleteClient && (
                    <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/clients/${client.id}`}>
                        <button className="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-500/10 hover:text-blue-400 text-slate-500 flex items-center justify-center transition-colors">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(client.id, client.name)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-slate-500 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-slate-500 text-xs">Showing {filtered.length} of {clients.length} clients</p>
            <p className="text-slate-600 text-xs">Click a client to view details →</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
