'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Loader2, Download, Send, RefreshCw, Eye, CheckCircle, Clock, Mail, AlertCircle } from 'lucide-react'
import { Client, DocumentMeta, DOCUMENTS, DocumentStatus } from '@/types'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

const statusStyle: Record<string, string> = {
  pending: 'badge badge-slate',
  generated: 'badge badge-blue',
  sent: 'badge badge-violet',
  delivered: 'badge badge-green',
  opened: 'badge badge-green',
}

export default function DocumentsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleGenerate(clientId: string, clientName: string, type: string) {
    const key = `${clientId}-${type}`
    setGenerating(key)
    try {
      const res = await fetch(`/api/generate/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${clientName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: `✅ ${type} PDF downloaded!` })
    } catch {
      toast({ variant: 'destructive', title: 'Generation failed' })
    } finally {
      setGenerating(null)
    }
  }

  const filtered = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="page-header">Documents</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Contract · Welcome · Invoice · Thank You — generate, download, and send as PDF</p>
        </div>
        <div className="relative">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-56 h-9 bg-slate-50 border-slate-200 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm rounded-xl focus:border-blue-500/50"
          />
        </div>
      </motion.div>

      {/* Indian law notice */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/15 bg-blue-500/5 text-[var(--text-tertiary)] text-xs"
      >
        <span className="text-base">⚖️</span>
        <span>All documents are governed by <strong className="text-blue-400">Indian Contract Act, 1872</strong> · IT Act 2000 · Arbitration &amp; Conciliation Act, 1996 · Jurisdiction: Hyderabad, Telangana, India</span>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-[var(--text-secondary)]" />
          </div>
          <p className="text-white font-medium">No clients found</p>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Add a client first to generate documents</p>
          <Link href="/clients/new">
            <Button className="mt-4 anx-gradient text-white text-sm font-medium gap-2 px-4 py-2 rounded-xl hover:opacity-90">
              Add Client →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((client, ci) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.04 }}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
            >
              {/* Client header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{client.name}</p>
                  <p className="text-[var(--text-tertiary)] text-xs">{client.service} · {client.email}</p>
                </div>
                <Link href={`/clients/${client.id}`} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
                  View client →
                </Link>
              </div>

              {/* Document cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-slate-100">
                {DOCUMENTS.map(doc => {
                  const key = `${client.id}-${doc.id}`
                  const isGenerating = generating === key
                  return (
                    <div key={doc.id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{doc.icon}</span>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-medium truncate">{doc.title}</p>
                          <p className="text-[var(--text-tertiary)] text-[10px] truncate">{doc.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGenerate(client.id, client.name, doc.id)}
                        disabled={isGenerating}
                        className="flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/15 transition-colors disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                        ) : (
                          <><Download className="w-3 h-3" /> Generate PDF</>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
