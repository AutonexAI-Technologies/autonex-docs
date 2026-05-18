'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  IndianRupee,
  TrendingUp,
  Clock,
  FileText,
  RefreshCw,
  Plus,
  ArrowRight,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  Activity,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Client } from '@/types'
import { format } from 'date-fns'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
})

const statusColors: Record<string, string> = {
  Lead: 'badge badge-violet',
  Active: 'badge badge-green',
  Completed: 'badge badge-blue',
  'On Hold': 'badge badge-yellow',
  Cancelled: 'badge badge-red',
}

function StatCard({ label, value, icon: Icon, color, bg, border, delay }: any) {
  return (
    <motion.div {...fadeUp(delay)} className={`stat-card border ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-sm">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color} font-[Plus_Jakarta_Sans]`}>{value}</p>
    </motion.div>
  )
}

// Separated into its own component so Suspense can wrap it (Next.js requirement)
function AccessDeniedToast() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  useEffect(() => {
    if (searchParams.get('access_denied') === '1') {
      toast({
        variant: 'destructive',
        title: '🔒 Access Restricted',
        description: 'You don\'t have permission to access that page.',
      })
    }
  }, [searchParams])
  return null
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(data => { setClients(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const now = new Date()
  const thisMonth = clients.filter(c => {
    const d = new Date(c.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const activeClients = clients.filter(c => c.status === 'Active')
  const totalRevenue = clients.reduce((s, c) => s + (c.total_fee || 0), 0)
  const pendingPayments = clients.filter(c => c.status === 'Lead').length

  const stats = [
    { label: 'Total Clients', value: clients.length.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/15', delay: 0 },
    { label: 'Active This Month', value: thisMonth.length.toString(), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', delay: 0.05 },
    { label: 'Total Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15', delay: 0.1 },
    { label: 'Pending Payments', value: pendingPayments.toString(), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15', delay: 0.15 },
    { label: 'Active Clients', value: activeClients.length.toString(), icon: CheckCircle, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/15', delay: 0.2 },
    { label: 'Documents Sent', value: '—', icon: FileText, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/15', delay: 0.25 },
  ]

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">

      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium uppercase tracking-widest">Live Platform</span>
          </div>
          <h1 className="page-header">Operations Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back to Autonex AI HQ</p>
        </div>
        <Link href="/clients/new">
          <Button className="anx-gradient text-white font-semibold gap-2 h-10 px-5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" />
            New Client
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick Actions */}
      <motion.div {...fadeUp(0.3)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'New Invoice', href: '/invoices', icon: '🧾', color: 'text-blue-400' },
          { label: 'All Documents', href: '/documents', icon: '📄', color: 'text-violet-400' },
          { label: 'Team', href: '/team', icon: '👥', color: 'text-emerald-400' },
          { label: 'Reports', href: '/reports', icon: '📊', color: 'text-amber-400' },
        ].map(action => (
          <Link key={action.href} href={action.href}>
            <motion.div
              whileHover={{ scale: 1.01, y: -1 }}
              className="glass-card rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-blue-500/20 transition-colors"
            >
              <span className="text-xl">{action.icon}</span>
              <span className={`text-sm font-medium ${action.color}`}>{action.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 ml-auto" />
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Clients Table */}
      <motion.div {...fadeUp(0.35)} className="rounded-2xl border border-white/5 bg-[#0d1a35]/60 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/5">
          <div>
            <h2 className="text-white font-semibold text-sm">All Clients</h2>
            <p className="text-slate-500 text-xs">{clients.length} total</p>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm rounded-lg focus:border-blue-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-slate-500 text-sm">Loading clients...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {search ? 'No clients match your search' : 'No clients yet'}
            </p>
            {!search && (
              <Link href="/clients/new">
                <Button variant="ghost" className="mt-3 text-blue-400 hover:text-blue-300 text-sm">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add your first client
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {/* Table head */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-3 text-xs text-slate-500 uppercase tracking-wider">
              <span>Client</span>
              <span>Service</span>
              <span>Status</span>
              <span>Revenue</span>
              <span>Added</span>
            </div>
            {filtered.slice(0, 20).map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/clients/${client.id}`}>
                  <div className="grid grid-cols-[1fr] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors group cursor-pointer">
                    {/* Name + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 font-bold text-xs">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{client.name}</p>
                        <p className="text-slate-500 text-xs truncate">{client.email}</p>
                      </div>
                    </div>
                    <span className="hidden sm:block text-slate-400 text-xs truncate max-w-[140px]">{client.service}</span>
                    <span className={`hidden sm:inline-flex ${statusColors[client.status] || 'badge badge-slate'}`}>
                      {client.status || 'Lead'}
                    </span>
                    <span className="hidden sm:block text-white font-semibold text-sm">
                      ₹{(client.total_fee || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="hidden sm:flex items-center gap-1 text-slate-500 text-xs">
                      {format(new Date(client.created_at), 'dd MMM')}
                      <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {filtered.length > 20 && (
          <div className="px-6 py-3 border-t border-white/5">
            <Link href="/clients" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
              View all {filtered.length} clients →
            </Link>
          </div>
        )}
      </motion.div>

      {/* Background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-blue-600/3 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Access denied toast — must be in Suspense */}
      <Suspense fallback={null}>
        <AccessDeniedToast />
      </Suspense>
    </div>
  )
}
