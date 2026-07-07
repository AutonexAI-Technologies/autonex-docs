'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, IndianRupee, Users, Download,
  RefreshCw, PieChart, Activity, ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Client, DEFAULT_SERVICES } from '@/types'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend,
} from 'recharts'

function CustomTooltip({ active, payload, label, prefix = '₹' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-slate-500 mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}
        </p>
      ))}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#3B82F6', Lead: '#8B5CF6', Completed: '#0EA5E9', 'On Hold': '#F59E0B', Cancelled: '#EF4444',
}
const SERVICE_COLORS = ['#3B82F6', '#8B5CF6', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#F97316', '#6366F1']

export default function ReportsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
    ]).then(([c, inv]) => {
      setClients(Array.isArray(c) ? c : [])
      setInvoices(Array.isArray(inv) ? inv : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Derived metrics
  const totalRevenue = clients.reduce((s, c) => s + (c.total_fee || 0), 0)
  const activeClients = clients.filter(c => c.status === 'Active').length
  const retainerClients = clients.filter(c => c.project_type === 'retainer').length
  const retainerRevenue = clients.filter(c => c.project_type === 'retainer').reduce((s, c) => s + (c.total_fee || 0), 0)

  // Revenue by service (top 6)
  const serviceData = DEFAULT_SERVICES.slice(0, 8).map(svc => {
    const matching = clients.filter(c => c.service === svc.name)
    return { name: svc.name.split(' ')[0], revenue: matching.reduce((s, c) => s + (c.total_fee || 0), 0), count: matching.length }
  }).filter(s => s.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 6)

  // Invoice status pie
  const invStatusData = ['Paid', 'Pending', 'Overdue', 'Cancelled'].map(st => ({
    name: st,
    value: invoices.filter(i => i.status === st).length,
  })).filter(s => s.value > 0)
  const invColors = { Paid: '#3B82F6', Pending: '#F59E0B', Overdue: '#EF4444', Cancelled: '#94A3B8' }

  // Client status pie
  const clientStatusData = ['Active', 'Lead', 'Completed', 'On Hold', 'Cancelled'].map(st => ({
    name: st, value: clients.filter(c => c.status === st).length,
  })).filter(s => s.value > 0)

  // Invoice revenue by month (last 6 months)
  const monthlyRevenue = (() => {
    const map: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      map[key] = 0
    }
    invoices.filter(i => i.status === 'Paid').forEach(inv => {
      const d = new Date(inv.created_at)
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      if (key in map) map[key] += inv.total || 0
    })
    return Object.entries(map).map(([month, revenue]) => ({ month, revenue }))
  })()

  // CSV export
  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Company', 'Service', 'Status', 'Type', 'Total Fee']
    const rows = clients.map(c => [
      c.name, c.email, c.company || '', c.service, c.status, c.project_type || 'one-time', c.total_fee || 0
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `autonex-clients-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="page-header">Reports &amp; Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Revenue breakdown, service analysis, and invoice tracking</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="border-slate-200 text-slate-300 hover:text-white hover:bg-slate-50 gap-2 h-10 px-4 rounded-xl">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/15', trend: '+12%' },
              { label: 'Active Clients', value: activeClients.toString(), icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/15', trend: `${clients.length} total` },
              { label: 'Retainer MRR', value: `₹${(retainerRevenue / 100000).toFixed(1)}L`, icon: RefreshCw, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/15', trend: `${retainerClients} retainers` },
              { label: 'Invoices Raised', value: invoices.length.toString(), icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/15', trend: `${invoices.filter(i => i.status === 'Paid').length} paid` },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`stat-card border ${s.border}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-slate-400 text-xs">{s.label}</p>
                  <div className={`w-8 h-8 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                    <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                  <p className="text-[11px] text-slate-500">{s.trend}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Row 1: Revenue trend + Service breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue by Month */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h2 className="text-slate-800 font-semibold text-sm">Revenue Collected (Last 6 Months)</h2>
              </div>
              {monthlyRevenue.every(m => m.revenue === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No paid invoices yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthlyRevenue} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Service Revenue */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-5">
                <PieChart className="w-4 h-4 text-violet-400" />
                <h2 className="text-slate-800 font-semibold text-sm">Revenue by Service</h2>
              </div>
              {serviceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No client data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={serviceData} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} name="Revenue">
                      {serviceData.map((_, i) => <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Row 2: Client status pie + Invoice status pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Status */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-4 h-4 text-blue-400" />
                <h2 className="text-slate-800 font-semibold text-sm">Client Status Distribution</h2>
              </div>
              {clients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="w-8 h-8 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No clients yet</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <RePieChart>
                      <Pie data={clientStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {clientStatusData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94A3B8'} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {clientStatusData.map(entry => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[entry.name] ?? '#94A3B8' }} />
                          <span className="text-xs text-slate-600">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Invoice Status */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-amber-400" />
                <h2 className="text-slate-800 font-semibold text-sm">Invoice Status Breakdown</h2>
              </div>
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="w-8 h-8 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm">No invoices yet</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={140} height={140}>
                    <RePieChart>
                      <Pie data={invStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {invStatusData.map((entry) => (
                          <Cell key={entry.name} fill={(invColors as any)[entry.name] ?? '#94A3B8'} />
                        ))}
                      </Pie>
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {invStatusData.map(entry => {
                      const total = invoices.filter(i => i.status === entry.name).reduce((s: number, i: any) => s + (i.total || 0), 0)
                      return (
                        <div key={entry.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: (invColors as any)[entry.name] }} />
                            <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-800">₹{(total / 1000).toFixed(0)}K</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
