'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, AlertTriangle, IndianRupee, Calendar, PlayCircle, PauseCircle, XCircle, Zap, ToggleLeft, ToggleRight } from 'lucide-react'
import { Retainer, RetainerStatus } from '@/types'
import { format, differenceInDays, isPast } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

const statusStyle: Record<RetainerStatus, string> = {
  Active: 'badge badge-green',
  Paused: 'badge badge-yellow',
  Cancelled: 'badge badge-red',
}

export default function RetainersPage() {
  const { toast } = useToast()
  const [retainers, setRetainers] = useState<Retainer[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/retainers')
    const data = await res.json()
    setRetainers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: RetainerStatus) {
    const res = await fetch(`/api/retainers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast({ title: `✅ Retainer ${status.toLowerCase()}` })
      load()
    }
  }

  async function toggleAutoInvoice(id: string, current: boolean) {
    const res = await fetch(`/api/retainers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_invoice: !current }),
    })
    if (res.ok) {
      toast({ title: !current ? '🤖 Auto-invoice enabled' : '⏸ Auto-invoice disabled' })
      load()
    }
  }

  async function runAutoInvoice() {
    const res = await fetch('/api/retainers/generate-invoices', { method: 'POST' })
    const data = await res.json()
    toast({ title: `✅ ${data.message || 'Invoices generated'}` })
    load()
  }

  const active = retainers.filter(r => r.status === 'Active')
  const totalMonthly = active.reduce((s, r) => s + r.amount, 0)
  const dueSoon = active.filter(r => {
    const days = differenceInDays(new Date(r.next_billing_date), new Date())
    return days <= 7 && days >= 0
  })
  const overdue = active.filter(r => isPast(new Date(r.next_billing_date)))

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4 mb-8"
      >
        <div>
          <h1 className="page-header">Monthly Retainers</h1>
          <p className="text-slate-400 text-sm mt-1">
            {active.length} active · ₹{totalMonthly.toLocaleString('en-IN')}/mo recurring
          </p>
        </div>
        <button
          onClick={runAutoInvoice}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Run Auto-Invoice
        </button>
      </motion.div>

      {/* Alerts */}
      {(dueSoon.length > 0 || overdue.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 space-y-3"
        >
          {overdue.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{overdue.length} retainer invoice{overdue.length > 1 ? 's are' : ' is'} overdue</strong> — generate invoices now.
              </span>
            </div>
          )}
          {dueSoon.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-sm">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>
                <strong>{dueSoon.length} retainer invoice{dueSoon.length > 1 ? 's are' : ' is'} due within 7 days</strong> — prepare now.
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Retainers', value: active.length.toString(), color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
          { label: 'Monthly Recurring', value: `₹${totalMonthly.toLocaleString('en-IN')}`, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/15' },
          { label: 'Total Billed (All Time)', value: `₹${retainers.reduce((s, r) => s + r.total_billed, 0).toLocaleString('en-IN')}`, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`stat-card border ${s.border}`}
          >
            <p className="text-slate-400 text-sm mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} font-[Plus_Jakarta_Sans]`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Retainers Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
      >
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
          <span>Client</span>
          <span>Amount</span>
          <span>Cycle</span>
          <span>Status</span>
          <span>Next Billing</span>
          <span>Auto-Invoice</span>
          <span className="w-24" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : retainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-white font-medium">No retainers yet</p>
            <p className="text-slate-500 text-sm mt-1">Set up a monthly retainer when adding a client</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {retainers.map((r, i) => {
              const daysUntil = differenceInDays(new Date(r.next_billing_date), new Date())
              const isDue = daysUntil <= 7 && daysUntil >= 0
              const isOverdue = isPast(new Date(r.next_billing_date)) && r.status === 'Active'
              const clientName = (r as any).clients?.name || '—'

              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-slate-50 transition-colors group">
                    <div>
                      <p className="text-white text-sm font-medium">{clientName}</p>
                      <p className="text-slate-500 text-xs">{(r as any).clients?.email}</p>
                    </div>
                    <p className="hidden md:block text-white font-semibold text-sm">
                      ₹{r.amount.toLocaleString('en-IN')}<span className="text-slate-500 font-normal text-xs">/mo</span>
                    </p>
                    <span className="hidden md:block text-slate-400 text-xs capitalize">{r.billing_cycle}</span>
                    <span className={`hidden md:inline-flex ${statusStyle[r.status]}`}>{r.status}</span>
                    <div className="hidden md:block">
                      <p className={`text-xs font-medium ${isOverdue ? 'text-red-400' : isDue ? 'text-amber-400' : 'text-slate-300'}`}>
                        {isOverdue ? '⚠️ Overdue' : isDue ? `⏰ ${daysUntil}d left` : format(new Date(r.next_billing_date), 'dd MMM yyyy')}
                      </p>
                    </div>

                    {/* Auto-Invoice Toggle */}
                    <div className="hidden md:flex items-center">
                      <button
                        onClick={() => toggleAutoInvoice(r.id, !!(r as any).auto_invoice)}
                        title={(r as any).auto_invoice ? 'Disable auto-invoice' : 'Enable auto-invoice'}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                          (r as any).auto_invoice
                            ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {(r as any).auto_invoice
                          ? <><ToggleRight className="w-3.5 h-3.5" /> On</>
                          : <><ToggleLeft className="w-3.5 h-3.5" /> Off</>}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === 'Active' && (
                        <button
                          onClick={() => updateStatus(r.id, 'Paused')}
                          className="w-7 h-7 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-colors"
                          title="Pause retainer"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.status === 'Paused' && (
                        <button
                          onClick={() => updateStatus(r.id, 'Active')}
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors"
                          title="Resume retainer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.status !== 'Cancelled' && (
                        <button
                          onClick={() => updateStatus(r.id, 'Cancelled')}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                          title="Cancel retainer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
