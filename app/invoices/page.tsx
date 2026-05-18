'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Receipt, CheckCircle, Clock, AlertCircle, Ban,
  Loader2, X, Trash2, CheckCheck, ChevronDown, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Invoice, PaymentStatus, Client } from '@/types'
import { format, isPast } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

const statusIcon: Record<PaymentStatus, any> = {
  Pending: Clock,
  Paid: CheckCircle,
  Overdue: AlertCircle,
  Cancelled: Ban,
}

const statusStyle: Record<PaymentStatus, string> = {
  Pending: 'badge badge-yellow',
  Paid: 'badge badge-green',
  Overdue: 'badge badge-red',
  Cancelled: 'badge badge-slate',
}

const STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Overdue', 'Cancelled']

interface LineItemRow {
  description: string
  quantity: number
  rate: number
}

// ─── New Invoice Panel ──────────────────────────────────────────────
function NewInvoicePanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [lineItems, setLineItems] = useState<LineItemRow[]>([
    { description: '', quantity: 1, rate: 0 },
  ])
  const [gstEnabled, setGstEnabled] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetch('/api/clients')
        .then(r => r.json())
        .then(d => setClients(Array.isArray(d) ? d : []))
    }
  }, [open])

  // Pre-fill rate when a client is selected
  useEffect(() => {
    if (clientId) {
      const c = clients.find(x => x.id === clientId)
      if (c && c.total_fee > 0) {
        setLineItems([{ description: c.service || 'Professional Services', quantity: 1, rate: c.total_fee }])
      }
    }
  }, [clientId])

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.rate, 0)
  const gstAmount = gstEnabled ? Math.round(subtotal * 0.18) : 0
  const total = subtotal + gstAmount

  function addLine() {
    setLineItems(p => [...p, { description: '', quantity: 1, rate: 0 }])
  }
  function removeLine(i: number) {
    setLineItems(p => p.filter((_, idx) => idx !== i))
  }
  function updateLine(i: number, field: keyof LineItemRow, val: string | number) {
    setLineItems(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      toast({ variant: 'destructive', title: 'Please select a client.' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        line_items: lineItems.map(l => ({
          ...l,
          amount: l.quantity * l.rate,
        })),
        gst_enabled: gstEnabled,
        due_date: dueDate || null,
        notes: notes || null,
        is_retainer_invoice: false,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: data.error })
    } else {
      toast({ title: `✅ Invoice ${data.invoice_number} created!` })
      onCreated()
      onClose()
    }
    setSaving(false)
  }

  const inputCls = 'h-9 px-3 bg-[#0a1628] border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500/50 w-full placeholder:text-slate-600'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0d1a35] border-l border-white/5 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div>
                <h2 className="text-white font-bold text-base">New Invoice</h2>
                <p className="text-slate-500 text-xs mt-0.5">Auto-assigned ANX-XXX number</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
              {/* Client selector */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Client <span className="text-blue-400">*</span></label>
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  required
                  className={`${inputCls} h-10`}
                >
                  <option value="">Select a client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                  ))}
                </select>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-400 text-xs">Line Items</label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="text-blue-400 text-xs hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add line
                  </button>
                </div>

                {/* Column labels */}
                <div className="grid grid-cols-[1fr_60px_80px_28px] gap-2 mb-1.5 text-[10px] text-slate-600 uppercase tracking-wider px-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Rate (₹)</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {lineItems.map((line, i) => (
                    <div key={i} className="grid grid-cols-[1fr_60px_80px_28px] gap-2 items-center">
                      <input
                        value={line.description}
                        onChange={e => updateLine(i, 'description', e.target.value)}
                        placeholder="Service description"
                        required
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={e => updateLine(i, 'quantity', Number(e.target.value))}
                        className={inputCls}
                      />
                      <input
                        type="number"
                        min={0}
                        value={line.rate}
                        onChange={e => updateLine(i, 'rate', Number(e.target.value))}
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={lineItems.length === 1}
                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST toggle */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-[#0a1628]/60">
                <div>
                  <p className="text-white text-sm font-medium">GST 18%</p>
                  <p className="text-slate-500 text-xs">Goods & Services Tax</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGstEnabled(p => !p)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${gstEnabled ? 'bg-blue-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${gstEnabled ? 'left-5.5 left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Totals */}
              <div className="rounded-xl border border-white/5 bg-[#0a1628]/60 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {gstEnabled && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">GST (18%)</span>
                    <span className="text-white">₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-white/5">
                  <span className="text-white">Total</span>
                  <span className="text-blue-400">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>50% Deposit</span>
                  <span>₹{Math.round(total * 0.5).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 bg-[#0a1628] border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-slate-600"
                />
              </div>

              {/* Indian law note */}
              <div className="flex items-start gap-2 text-xs text-slate-600 px-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Late payment interest of 1.5%/month applies after due date as per Indian law.</span>
              </div>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                className="flex-1 h-10 border border-white/10 text-slate-400 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit as any}
                disabled={saving || !clientId}
                className="flex-[2] h-10 anx-gradient text-white font-semibold rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
                ) : (
                  'Create Invoice →'
                )}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { toast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PaymentStatus | 'All'>('All')
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/invoices')
    const data = await res.json()
    setInvoices(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleMarkPaid(id: string) {
    setMarkingPaid(id)
    const res = await fetch(`/api/invoices/${id}/mark-paid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_method: 'Bank Transfer' }),
    })
    if (res.ok) {
      toast({ title: '✅ Invoice marked as paid!' })
      load()
    } else {
      toast({ variant: 'destructive', title: 'Failed to update' })
    }
    setMarkingPaid(null)
  }

  const filtered = invoices.filter(inv => {
    const name = (inv as any).clients?.name ?? ''
    const matchSearch =
      !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || inv.status === filter
    return matchSearch && matchFilter
  })

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0)
  const pendingAmt = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.total, 0)
  const overdueCount = invoices.filter(i => i.status === 'Overdue').length

  return (
    <>
      <NewInvoicePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onCreated={load}
      />

      <div className="px-6 py-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4 mb-8"
        >
          <div>
            <h1 className="page-header">Invoice Management</h1>
            <p className="text-slate-400 text-sm mt-1">
              {invoices.length} invoices · ANX-XXX auto-numbering · GST compliant
            </p>
          </div>
          <Button
            onClick={() => setPanelOpen(true)}
            className="anx-gradient text-white font-semibold gap-2 h-10 px-5 rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Paid', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'text-emerald-400', border: 'border-emerald-500/15' },
            { label: 'Pending Amount', value: `₹${pendingAmt.toLocaleString('en-IN')}`, color: 'text-amber-400', border: 'border-amber-500/15' },
            { label: 'Overdue', value: `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`, color: 'text-red-400', border: 'border-red-500/15' },
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

        {/* Filters + Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 flex-wrap mb-5"
        >
          {(['All', ...STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                filter === s
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {s}
              {s !== 'All' && (
                <span className="ml-1 opacity-60">
                  {invoices.filter(i => i.status === s).length}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 w-56 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm rounded-xl focus:border-blue-500/50"
            />
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/5 bg-[#0d1a35]/60 overflow-hidden"
        >
          <div className="hidden md:grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
            <span>Invoice #</span>
            <span>Client</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Due Date</span>
            <span className="w-24" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-white font-medium">No invoices yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Click <strong className="text-blue-400">New Invoice</strong> to create your first one
              </p>
              <Button
                onClick={() => setPanelOpen(true)}
                className="mt-4 anx-gradient text-white text-sm gap-2 h-9 px-4 rounded-xl hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> New Invoice
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filtered.map((inv, i) => {
                const StatusIcon = statusIcon[inv.status] || Clock
                const isOverdue =
                  inv.status === 'Pending' &&
                  inv.due_date &&
                  isPast(new Date(inv.due_date))
                const clientName = (inv as any).clients?.name || '—'

                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="group"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <div>
                        <p className="text-blue-400 font-bold text-sm font-mono">
                          {inv.invoice_number}
                        </p>
                        {inv.is_retainer_invoice && (
                          <span className="text-xs text-violet-400">🔄 Retainer</span>
                        )}
                      </div>
                      <p className="hidden md:block text-white text-sm">{clientName}</p>
                      <div className="hidden md:block">
                        <p className="text-white font-semibold text-sm">
                          ₹{inv.total.toLocaleString('en-IN')}
                        </p>
                        {inv.gst_enabled && (
                          <p className="text-slate-500 text-xs">
                            incl. GST ₹{inv.gst_amount.toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                      <span
                        className={`hidden md:inline-flex ${
                          isOverdue ? 'badge badge-red' : statusStyle[inv.status]
                        }`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {isOverdue ? 'Overdue' : inv.status}
                      </span>
                      <span className="hidden md:block text-slate-400 text-xs">
                        {inv.due_date
                          ? format(new Date(inv.due_date), 'dd MMM yyyy')
                          : '—'}
                      </span>
                      <div className="hidden md:flex items-center gap-1">
                        {(inv.status === 'Pending' || isOverdue) && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={markingPaid === inv.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            {markingPaid === inv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3 h-3" />
                            )}
                            Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-white/5">
              <p className="text-slate-500 text-xs">
                Showing {filtered.length} of {invoices.length} invoices
              </p>
            </div>
          )}
        </motion.div>

        {/* Late payment notice */}
        <p className="text-slate-700 text-xs mt-4 text-center">
          ⚖️ 1.5%/month interest on overdue invoices · MSME delayed payment norms · Hyderabad jurisdiction
        </p>
      </div>
    </>
  )
}
