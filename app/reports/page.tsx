'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, IndianRupee, Users, Download,
  RefreshCw, PieChart, Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Client, DEFAULT_SERVICES } from '@/types'

export default function ReportsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => {
      setClients(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Compute service breakdown
  const serviceBreakdown = DEFAULT_SERVICES.slice(0, 8).map(svc => {
    const matching = clients.filter(c => c.service === svc.name)
    return {
      name: svc.name,
      emoji: svc.emoji,
      count: matching.length,
      revenue: matching.reduce((s, c) => s + (c.total_fee || 0), 0),
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = clients.reduce((s, c) => s + (c.total_fee || 0), 0)
  const activeClients = clients.filter(c => c.status === 'Active').length
  const retainerClients = clients.filter(c => c.project_type === 'retainer').length
  const retainerRevenue = clients.filter(c => c.project_type === 'retainer').reduce((s, c) => s + (c.total_fee || 0), 0)

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="page-header">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">Revenue breakdown, service analysis, and team activity</p>
        </div>
        <Button variant="outline" className="border-slate-200 text-slate-300 hover:text-white hover:bg-slate-50 gap-2 h-10 px-4 rounded-xl">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: IndianRupee, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/15' },
          { label: 'Active Clients', value: activeClients.toString(), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
          { label: 'Retainer Revenue', value: `₹${(retainerRevenue / 100000).toFixed(1)}L`, icon: RefreshCw, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
          { label: 'Retainer Clients', value: retainerClients.toString(), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`stat-card border ${s.border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-xs">{s.label}</p>
              <div className={`w-8 h-8 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${s.color} font-[Plus_Jakarta_Sans]`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-semibold text-sm">Revenue by Service</h2>
          </div>
          {serviceBreakdown.filter(s => s.count > 0).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">No client data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {serviceBreakdown.filter(s => s.count > 0).map(svc => (
                <div key={svc.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{svc.emoji}</span>
                      <span className="text-slate-300 text-xs truncate max-w-[180px]">{svc.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs">{svc.count} clients</span>
                      <span className="text-white font-semibold text-xs">₹{svc.revenue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${totalRevenue ? (svc.revenue / totalRevenue) * 100 : 0}%` }}
                      transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full anx-gradient"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* One-time vs Retainer */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-violet-400" />
            <h2 className="text-white font-semibold text-sm">One-time vs Retainer</h2>
          </div>

          {totalRevenue === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">No revenue data yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Donut visualization */}
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
                    {/* Retainer arc */}
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="18"
                      strokeDasharray={`${totalRevenue ? (retainerRevenue / totalRevenue) * 251.2 : 0} 251.2`}
                      strokeLinecap="round"
                    />
                    {/* One-time arc */}
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="18"
                      strokeDasharray={`${totalRevenue ? ((totalRevenue - retainerRevenue) / totalRevenue) * 251.2 : 0} 251.2`}
                      strokeDashoffset={`${-(totalRevenue ? (retainerRevenue / totalRevenue) * 251.2 : 0)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white font-bold text-sm">{clients.length}</p>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-slate-400 text-xs">Monthly Retainer</span>
                    </div>
                    <p className="text-white font-semibold text-sm">₹{retainerRevenue.toLocaleString('en-IN')}</p>
                    <p className="text-slate-500 text-xs">{retainerClients} clients</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-violet-600" />
                      <span className="text-slate-400 text-xs">One-time Projects</span>
                    </div>
                    <p className="text-white font-semibold text-sm">₹{(totalRevenue - retainerRevenue).toLocaleString('en-IN')}</p>
                    <p className="text-slate-500 text-xs">{clients.length - retainerClients} clients</p>
                  </div>
                </div>
              </div>

              {/* Client status breakdown */}
              <div>
                <p className="text-slate-500 text-xs mb-3 uppercase tracking-wider">Client Status Breakdown</p>
                {(['Active', 'Lead', 'Completed', 'On Hold', 'Cancelled'] as const).map(status => {
                  const count = clients.filter(c => c.status === status).length
                  return (
                    <div key={status} className="flex items-center gap-2 mb-2">
                      <span className="text-slate-400 text-xs w-20">{status}</span>
                      <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${clients.length ? (count / clients.length) * 100 : 0}%` }}
                          transition={{ delay: 0.5, duration: 0.6 }}
                          className="h-full rounded-full bg-blue-500/70"
                        />
                      </div>
                      <span className="text-white text-xs w-4 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
