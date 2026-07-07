'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LifeBuoy, Plus, Clock, AlertCircle, CheckCircle2,
  Play, X, MessageSquare, ChevronDown, ChevronUp,
  Loader2, Send
} from 'lucide-react'

interface Ticket {
  id: string
  title: string
  description: string
  ticket_type: string
  urgency: string
  status: string
  raiser_name: string
  created_at: string
  responses?: Response[]
}
interface Response {
  id: string
  author_name: string
  author_type: string
  content: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  open:        { icon: AlertCircle,  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  in_progress: { icon: Play,         color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  resolved:    { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  closed:      { icon: X,            color: 'text-slate-400',   bg: 'bg-slate-500/10' },
}
const URGENCY_COLOR: Record<string, string> = {
  low: 'text-slate-400 bg-slate-500/10',
  medium: 'text-blue-400 bg-blue-500/10',
  high: 'text-amber-400 bg-amber-500/10',
  critical: 'text-red-400 bg-red-500/10',
}

export default function SupportPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newTicket, setNewTicket] = useState({ title: '', description: '', ticket_type: 'general', urgency: 'medium' })
  const [userName, setUserName] = useState('Team')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*, ticket_responses(*)')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
    setTickets((data as Ticket[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (user) {
        supabase.from('team_members').select('name').eq('email', user.email ?? '').maybeSingle()
          .then(({ data: m }: any) => { if (m) setUserName((m as any).name) })
      }
    })
  }, [load, supabase])

  const createTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim() || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('support_tickets').insert({
      client_id: id,
      raised_by: user?.id,
      raiser_name: userName,
      title: newTicket.title.trim(),
      description: newTicket.description.trim(),
      ticket_type: newTicket.ticket_type,
      urgency: newTicket.urgency,
    })
    setNewTicket({ title: '', description: '', ticket_type: 'general', urgency: 'medium' })
    setShowNew(false)
    setSending(false)
    load()
  }

  const sendReply = async (ticketId: string) => {
    if (!reply.trim() || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('ticket_responses').insert({
      ticket_id: ticketId,
      client_id: id,
      author_id: user?.id,
      author_name: userName,
      author_type: 'team',
      content: reply.trim(),
    })
    setReply('')
    setSending(false)
    load()
  }

  const updateStatus = async (ticketId: string, status: string) => {
    await supabase.from('support_tickets').update({
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', ticketId)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-blue-400" />
          Support Tickets
        </h2>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg"><Plus className="w-3 h-3" />New Ticket</button>
      </div>

      {/* New ticket form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <input value={newTicket.title} onChange={e => setNewTicket(f => ({ ...f, title: e.target.value }))} placeholder="Title…" className="input-dark w-full" />
            <textarea value={newTicket.description} onChange={e => setNewTicket(f => ({ ...f, description: e.target.value }))} placeholder="Description…" rows={3} className="input-dark w-full resize-none" />
            <div className="flex gap-2">
              <select value={newTicket.ticket_type} onChange={e => setNewTicket(f => ({ ...f, ticket_type: e.target.value }))} className="input-dark flex-1">
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="delivery">Delivery</option>
                <option value="other">Other</option>
              </select>
              <select value={newTicket.urgency} onChange={e => setNewTicket(f => ({ ...f, urgency: e.target.value }))} className="input-dark flex-1">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={createTicket} disabled={sending || !newTicket.title.trim()} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-40"><Plus className="w-3 h-3" />Create</button>
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-slate-400 text-xs">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticket list */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <LifeBuoy className="w-10 h-10 text-slate-700" />
          <p className="text-slate-500 text-sm">No support tickets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t, i) => {
            const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.open
            const Ic = sc.icon
            const isOpen = expanded === t.id
            const responses = t.responses?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) ?? []

            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : t.id)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/2 transition-colors">
                  <div className={`w-8 h-8 rounded-lg ${sc.bg} flex items-center justify-center shrink-0`}>
                    <Ic className={`w-3.5 h-3.5 ${sc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${URGENCY_COLOR[t.urgency]}`}>{t.urgency}</span>
                      <span className="text-[10px] text-slate-600">{t.ticket_type}</span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] text-slate-600">{t.raiser_name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {responses.length > 0 && <span className="text-[10px] text-slate-500 flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" />{responses.length}</span>}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-200 overflow-hidden">
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-slate-400">{t.description}</p>
                        {/* Status buttons */}
                        <div className="flex gap-1.5">
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <button key={key} onClick={() => updateStatus(t.id, key)} className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${t.status === key ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 text-slate-600 hover:text-slate-400'}`}>
                              {key.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                        {/* Responses */}
                        {responses.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-slate-200">
                            {responses.map(r => (
                              <div key={r.id} className={`p-3 rounded-lg ${r.author_type === 'team' ? 'bg-blue-600/10 border border-blue-500/15' : 'bg-slate-50 border border-slate-200'}`}>
                                <p className="text-sm text-slate-300">{r.content}</p>
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-600">
                                  <span>{r.author_name}</span><span>·</span>
                                  <span>{new Date(r.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Reply */}
                        <div className="flex gap-2 mt-3">
                          <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply…" className="input-dark flex-1" onKeyDown={e => { if (e.key === 'Enter') sendReply(t.id) }} />
                          <button onClick={() => sendReply(t.id)} disabled={!reply.trim() || sending} className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg"><Send className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
