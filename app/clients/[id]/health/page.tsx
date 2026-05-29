'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, Circle, Save, Loader2 } from 'lucide-react'

interface Health {
  id: string
  rag_status: 'red' | 'amber' | 'green'
  notes: string | null
  updated_at: string
}

const RAG = {
  green: { label: 'Healthy', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'ring-emerald-500', dot: 'bg-emerald-500' },
  amber: { label: 'At Risk', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   ring: 'ring-amber-500',   dot: 'bg-amber-500' },
  red:   { label: 'Critical',color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     ring: 'ring-red-500',     dot: 'bg-red-500' },
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

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('client_health').select('*').eq('client_id', id).single()
    if (data) {
      setHealth(data as Health)
      setStatus((data as Health).rag_status)
      setNotes((data as Health).notes ?? '')
    }
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (saving) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (health) {
      await supabase.from('client_health').update({
        rag_status: status,
        notes: notes || null,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }).eq('id', health.id)
    } else {
      await supabase.from('client_health').insert({
        client_id: id,
        rag_status: status,
        notes: notes || null,
        updated_by: user?.id,
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

  return (
    <div className="space-y-6">
      {/* Current status display */}
      <div className={`p-6 rounded-2xl border-2 ${cfg.border} ${cfg.bg} transition-all duration-300`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-4 h-4 rounded-full ${cfg.dot} animate-pulse`} />
          <h2 className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</h2>
        </div>
        <p className="text-sm text-slate-400">
          {status === 'green' && 'This client engagement is on track. No issues detected.'}
          {status === 'amber' && 'This client engagement has potential risks that need attention.'}
          {status === 'red' && 'This client engagement is in a critical state. Immediate action required.'}
        </p>
      </div>

      {/* Status selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Update Health Status
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(Object.entries(RAG) as [keyof typeof RAG, typeof RAG[keyof typeof RAG]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                status === key
                  ? `${cfg.border} ${cfg.bg} ${cfg.color} ring-2 ${cfg.ring} ring-offset-2 ring-offset-[#0d1a35]`
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full ${status === key ? cfg.dot : 'bg-slate-100'} transition-all`} />
              <span className="text-sm font-medium">{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about the current status (visible only to team)…"
          rows={4}
          className="input-dark w-full resize-none mb-4"
        />

        <div className="flex items-center justify-between">
          {health?.updated_at && (
            <p className="text-[11px] text-slate-600">
              Last updated: {new Date(health.updated_at).toLocaleString('en-IN')}
            </p>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors ml-auto"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Circle className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
