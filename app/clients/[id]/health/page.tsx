'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, Circle, Save, Loader2, Sparkles, TrendingUp, MessageSquare, FileText, CreditCard } from 'lucide-react'

interface Health {
  id: string
  rag_status: 'red' | 'amber' | 'green'
  notes: string | null
  updated_at: string
}

interface Signal {
  label: string
  value: string | number
  status: 'good' | 'warn' | 'bad'
  icon: React.ComponentType<{ className?: string }>
}

const RAG = {
  green: { label: 'Healthy',  color: 'text-blue-500',  bg: 'bg-blue-500/8',   border: 'border-blue-500/30',  ring: 'ring-blue-500',  dot: 'bg-blue-500' },
  amber: { label: 'At Risk',  color: 'text-amber-500', bg: 'bg-amber-500/8',  border: 'border-amber-500/30', ring: 'ring-amber-500', dot: 'bg-amber-500' },
  red:   { label: 'Critical', color: 'text-red-500',   bg: 'bg-red-500/8',    border: 'border-red-500/30',   ring: 'ring-red-500',   dot: 'bg-red-500' },
}

function autoCalcStatus(signals: Signal[]): 'red' | 'amber' | 'green' {
  const bad = signals.filter(s => s.status === 'bad').length
  const warn = signals.filter(s => s.status === 'warn').length
  if (bad >= 2) return 'red'
  if (bad >= 1 || warn >= 2) return 'amber'
  return 'green'
}

export default function HealthPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'red' | 'amber' | 'green'>('green')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [signals, setSignals] = useState<Signal[]>([])
  const [autoStatus, setAutoStatus] = useState<'red' | 'amber' | 'green'>('green')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('client_health').select('*').eq('client_id', id).single()
    if (data) {
      setHealth(data as Health)
      setStatus((data as Health).rag_status)
      setNotes((data as Health).notes ?? '')
    }

    // Auto-calc signals
    const [msgRes, invoiceRes, docRes] = await Promise.all([
      supabase.from('chat_messages').select('id, created_at').eq('client_id', id).order('created_at', { ascending: false }).limit(1),
      supabase.from('invoices').select('id, status').eq('client_id', id),
      supabase.from('files').select('id, created_at').eq('client_id', id).order('created_at', { ascending: false }).limit(1),
    ])

    const lastMsg = msgRes.data?.[0]
    const daysSinceMsg = lastMsg ? Math.floor((Date.now() - new Date(lastMsg.created_at).getTime()) / 86400000) : 999
    const overdueInvoices = (invoiceRes.data ?? []).filter((i: any) => i.status === 'Overdue').length
    const lastDoc = docRes.data?.[0]
    const daysSinceDoc = lastDoc ? Math.floor((Date.now() - new Date(lastDoc.created_at).getTime()) / 86400000) : 999

    const sigs: Signal[] = [
      {
        label: 'Last Message',
        value: daysSinceMsg < 999 ? `${daysSinceMsg}d ago` : 'Never',
        status: daysSinceMsg <= 3 ? 'good' : daysSinceMsg <= 7 ? 'warn' : 'bad',
        icon: MessageSquare,
      },
      {
        label: 'Overdue Invoices',
        value: overdueInvoices,
        status: overdueInvoices === 0 ? 'good' : overdueInvoices === 1 ? 'warn' : 'bad',
        icon: CreditCard,
      },
      {
        label: 'Last File Uploaded',
        value: daysSinceDoc < 999 ? `${daysSinceDoc}d ago` : 'Never',
        status: daysSinceDoc <= 14 ? 'good' : daysSinceDoc <= 30 ? 'warn' : 'bad',
        icon: FileText,
      },
    ]
    setSignals(sigs)
    setAutoStatus(autoCalcStatus(sigs))
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const applyAutoCalc = () => setStatus(autoStatus)

  const save = async () => {
    if (saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (health) {
      await supabase.from('client_health').update({
        rag_status: status, notes: notes || null,
        updated_by: user?.id, updated_at: new Date().toISOString(),
      }).eq('id', health.id)
    } else {
      await supabase.from('client_health').insert({
        client_id: id, rag_status: status, notes: notes || null, updated_by: user?.id,
      })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const cfg = RAG[status]
  const signalColor = { good: 'text-blue-500 bg-blue-500/10 border-blue-500/20', warn: 'text-amber-500 bg-amber-500/10 border-amber-500/20', bad: 'text-red-400 bg-red-500/10 border-red-500/20' }

  return (
    <div className="space-y-5">
      {/* Current status banner */}
      <div className={`p-5 rounded-2xl border-2 ${cfg.border} ${cfg.bg} transition-all duration-300 flex items-center gap-4`}>
        <div className={`w-5 h-5 rounded-full ${cfg.dot} animate-pulse shrink-0`} />
        <div>
          <h2 className={`text-base font-bold ${cfg.color}`}>{cfg.label}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {status === 'green' && 'Client engagement is on track. No issues detected.'}
            {status === 'amber' && 'Potential risks that need attention.'}
            {status === 'red' && 'Critical state. Immediate action required.'}
          </p>
        </div>
      </div>

      {/* Auto-calc signals */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Auto-Calculated Health Signals
          </h3>
          <button onClick={applyAutoCalc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors">
            <TrendingUp className="w-3 h-3" />
            Apply Auto ({RAG[autoStatus].label})
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {signals.map(sig => (
            <div key={sig.label} className={`p-3 rounded-xl border text-center ${signalColor[sig.status]}`}>
              <sig.icon className="w-4 h-4 mx-auto mb-1.5" />
              <p className="text-xs font-bold">{sig.value}</p>
              <p className="text-[10px] mt-0.5 opacity-70">{sig.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Manual status selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Manual Override
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(Object.entries(RAG) as [keyof typeof RAG, typeof RAG[keyof typeof RAG]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setStatus(key)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                status === key
                  ? `${cfg.border} ${cfg.bg} ${cfg.color} ring-2 ${cfg.ring} ring-offset-2 ring-offset-white`
                  : 'border-slate-200 text-slate-400 hover:border-slate-300'
              }`}>
              <div className={`w-5 h-5 rounded-full ${status === key ? cfg.dot : 'bg-slate-200'} transition-all`} />
              <span className="text-sm font-medium">{cfg.label}</span>
            </button>
          ))}
        </div>

        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about the current status (visible to team only)…"
          rows={3} className="input-dark w-full resize-none mb-4" />

        <div className="flex items-center justify-between">
          {health?.updated_at && (
            <p className="text-[11px] text-slate-500">Last updated: {new Date(health.updated_at).toLocaleString('en-IN')}</p>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors ml-auto">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Circle className="w-3.5 h-3.5 text-blue-200" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
