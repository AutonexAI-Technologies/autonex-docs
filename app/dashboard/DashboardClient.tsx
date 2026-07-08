'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamicImport from 'next/dynamic'
import {
  Users, IndianRupee, TrendingUp, Clock, FileText,
  Plus, ArrowRight, Loader2, Search, CheckCircle, Shield,
} from 'lucide-react'
import { Client } from '@/types'
import { format } from 'date-fns'
import { useUserRole } from '@/lib/useUserRole'
import { createClient } from '@/lib/supabase'
import { ROLE_ACCESS_LABEL, ROLE_COLOR } from '@/lib/roleAccess'

const AccessDeniedToast = dynamicImport(() => import('@/components/AccessDeniedToast'), { ssr: false })

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] as any },
})

const STATUS_BADGE: Record<string, string> = {
  Lead:      'badge badge-violet',
  Active:    'badge badge-green',
  Completed: 'badge badge-blue',
  'On Hold': 'badge badge-yellow',
  Cancelled: 'badge badge-red',
}

function StatCard({ label, value, icon: Icon, accent, delay }: {
  label: string; value: string; icon: any; accent: string; delay: number
}) {
  return (
    <motion.div {...FADE_UP(delay)}
      className="stat-card flex flex-col gap-3"
      style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = '' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + '15' }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-[26px] font-bold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </motion.div>
  )
}

export default function DashboardClient() {
  const [clients, setClients]     = useState<Client[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [userName, setUserName]   = useState('')
  const { role_name, department_name, isAdmin, loading: roleLoading } = useUserRole()

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))

    createClient().auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.invited_name || user.email?.split('@')[0] || 'there'
        setUserName(name.split(' ')[0])
      }
    })
  }, [])

  const now          = new Date()
  const thisMonth    = clients.filter(c => { const d = new Date(c.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const activeClients= clients.filter(c => c.status === 'Active')
  const totalRevenue = clients.reduce((s, c) => s + (c.total_fee || 0), 0)
  const pendingLeads = clients.filter(c => c.status === 'Lead').length

  const STATS = [
    { label: 'Total Clients',    value: clients.length.toString(),                           icon: Users,       accent: '#0071E3', delay: 0    },
    { label: 'Active Clients',   value: activeClients.length.toString(),                     icon: CheckCircle, accent: '#30D158', delay: 0.05 },
    { label: 'New This Month',   value: thisMonth.length.toString(),                         icon: TrendingUp,  accent: '#FF9F0A', delay: 0.10 },
    { label: 'Total Revenue',    value: `₹${(totalRevenue/100000).toFixed(1)}L`,             icon: IndianRupee, accent: '#5856D6', delay: 0.15 },
    { label: 'Open Leads',       value: pendingLeads.toString(),                             icon: Clock,       accent: '#FF3B30', delay: 0.20 },
    { label: 'Documents',        value: '—',                                                 icon: FileText,    accent: '#34AADC', delay: 0.25 },
  ]

  const QUICK_ACTIONS = [
    { label: 'Invoices',   href: '/invoices',   emoji: '🧾' },
    { label: 'Documents',  href: '/documents',  emoji: '📄' },
    { label: 'Team',       href: '/team',       emoji: '👥' },
    { label: 'Reports',    href: '/reports',    emoji: '📊' },
  ]

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const displayRole  = role_name ?? 'Team Member'
  const roleColor    = role_name ? (ROLE_COLOR[role_name] ?? '') : ''
  const accessLabel  = role_name ? (ROLE_ACCESS_LABEL[role_name] ?? '') : 'Full Access'
  const canAddClient = !role_name || isAdmin || ['Founder', 'Managing Director', 'Head', 'Senior'].includes(role_name)

  return (
    <div className="page-container">

      {/* ── Header ── */}
      <motion.div {...FADE_UP(0)} className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--success)' }}>Live</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
            {userName ? `Good day, ${userName}` : 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Autonex AI Operations</p>
            {!roleLoading && role_name && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <Shield className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
                <span className={`text-[11px] font-semibold ${roleColor}`}>{displayRole}</span>
                {accessLabel && <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>· {accessLabel}</span>}
              </div>
            )}
          </div>
        </div>
        {canAddClient && (
          <Link href="/clients/new">
            <button className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" /> New Client
            </button>
          </Link>
        )}
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Quick Actions ── */}
      <motion.div {...FADE_UP(0.3)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {QUICK_ACTIONS.map(a => (
          <Link key={a.href} href={a.href}>
            <div
              className="card flex items-center gap-3 p-4 cursor-pointer"
              style={{ transition: 'box-shadow 0.15s, transform 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.transform = '' }}
            >
              <span className="text-xl">{a.emoji}</span>
              <span className="text-[13px] font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* ── Clients Table ── */}
      <motion.div {...FADE_UP(0.35)} className="card overflow-hidden">
        {/* Table header */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              All Clients
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{clients.length} total</p>
          </div>
          <div className="relative w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="search"
              placeholder="Search clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input w-full pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
            {!search && canAddClient && (
              <Link href="/clients/new">
                <button className="btn btn-secondary btn-sm gap-1.5 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add first client
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* Column headers */}
            <div
              className="hidden sm:grid px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{
                gridTemplateColumns: '1fr 160px 100px 100px 80px',
                color: 'var(--text-tertiary)',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-2)',
              }}
            >
              <span>Client</span>
              <span>Service</span>
              <span>Status</span>
              <span>Revenue</span>
              <span>Added</span>
            </div>

            {filtered.slice(0, 20).map((client, i) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <div
                  className="grid px-5 py-3.5 items-center cursor-pointer transition-colors"
                  style={{
                    gridTemplateColumns: '1fr',
                    borderBottom: i < Math.min(filtered.length, 20) - 1 ? '1px solid var(--divider)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.015)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div
                    className="sm:grid items-center gap-0"
                    style={{ gridTemplateColumns: '1fr 160px 100px 100px 80px', display: 'grid' }}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{client.email}</p>
                      </div>
                    </div>
                    <span className="hidden sm:block text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{client.service}</span>
                    <span className={`hidden sm:inline-flex ${STATUS_BADGE[client.status] || 'badge badge-gray'}`}>
                      {client.status || 'Lead'}
                    </span>
                    <span className="hidden sm:block text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ₹{(client.total_fee || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="hidden sm:flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      {format(new Date(client.created_at), 'dd MMM')}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}

            {filtered.length > 20 && (
              <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <Link href="/clients" className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
                  View all {filtered.length} clients →
                </Link>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <Suspense fallback={null}>
        <AccessDeniedToast />
      </Suspense>
    </div>
  )
}
