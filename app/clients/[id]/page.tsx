'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import DocumentCard from '@/components/DocumentCard'
import { Client, DOCUMENTS, ClientStatus } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, User, Mail, Phone, Building2, Briefcase,
  IndianRupee, CalendarDays, Loader2, Sparkles, RefreshCw,
  Edit, Trash2, StickyNote,
} from 'lucide-react'
import { format } from 'date-fns'

const statusStyles: Record<ClientStatus, string> = {
  Lead: 'badge badge-violet',
  Active: 'badge badge-green',
  Completed: 'badge badge-blue',
  'On Hold': 'badge badge-yellow',
  Cancelled: 'badge badge-red',
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingAll, setGeneratingAll] = useState(false)

  useEffect(() => {
    async function fetchClient() {
      const res = await fetch(`/api/clients/${id}`)
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Client not found' })
        router.push('/clients')
        return
      }
      const data = await res.json()
      setClient(data)
      setLoading(false)
    }
    fetchClient()
  }, [id])

  async function handleGenerateAll() {
    if (!client) return
    setGeneratingAll(true)
    const types = ['contract', 'welcome', 'invoice', 'thankyou']
    for (const type of types) {
      try {
        const res = await fetch(`/api/generate/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: client.id }),
        })
        if (!res.ok) throw new Error()
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 500))
      } catch {
        toast({ variant: 'destructive', title: `Failed to generate ${type}` })
      }
    }
    setGeneratingAll(false)
    toast({ title: '📦 All 4 PDFs downloaded!' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    )
  }

  if (!client) return null

  const deposit = client.deposit_fee || Math.round(client.total_fee * 0.5)

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-8 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Clients
      </Link>

      {/* Client Info Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/5 bg-[#0d1a35]/60 p-6 mb-6 backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
              <span className="text-blue-400 font-bold text-lg">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                <span className={statusStyles[client.status as ClientStatus] || 'badge badge-slate'}>
                  {client.status || 'Lead'}
                </span>
                {client.project_type === 'retainer' && (
                  <span className="badge badge-violet">
                    <RefreshCw className="w-2.5 h-2.5" />
                    Retainer
                  </span>
                )}
              </div>
              {client.company && (
                <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {client.company}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-slate-500 text-xs">
              {client.project_type === 'retainer' ? 'Monthly Retainer' : 'Total Project Value'}
            </p>
            <p className="text-2xl font-bold text-blue-400 font-[Plus_Jakarta_Sans]">
              ₹{client.total_fee.toLocaleString('en-IN')}
            </p>
            {client.project_type !== 'retainer' && (
              <p className="text-slate-500 text-xs mt-0.5">
                50% Deposit: ₹{deposit.toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-300 text-xs truncate">{client.email}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-300 text-xs">{client.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-300 text-xs truncate">{client.service}</span>
          </div>
          {client.start_date && (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-300 text-xs">{format(new Date(client.start_date), 'dd MMM yyyy')}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2">
            <StickyNote className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-slate-400 text-xs">{client.notes}</p>
          </div>
        )}
      </motion.div>

      {/* Payment details */}
      {(client.bank_name || client.upi_id) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/5 bg-[#0d1a35]/60 p-5 mb-6"
        >
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Payment Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {client.bank_name && <div><span className="text-slate-500">Bank:</span> <span className="text-white ml-1">{client.bank_name}</span></div>}
            {client.account_number && <div><span className="text-slate-500">Account:</span> <span className="text-white ml-1">{client.account_number}</span></div>}
            {client.ifsc_code && <div><span className="text-slate-500">IFSC:</span> <span className="text-white ml-1">{client.ifsc_code}</span></div>}
            {client.upi_id && <div><span className="text-slate-500">UPI:</span> <span className="text-white ml-1">{client.upi_id}</span></div>}
          </div>
        </motion.div>
      )}

      {/* Documents */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Documents</h2>
            <p className="text-slate-500 text-xs mt-0.5">Generate, download, or email each document independently</p>
          </div>
          <Button
            onClick={handleGenerateAll}
            disabled={generatingAll}
            variant="outline"
            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl h-9 px-4 text-sm gap-2"
          >
            {generatingAll ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Generate All 4</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DOCUMENTS.map((doc, i) => (
            <DocumentCard key={doc.id} doc={doc} client={client} index={i} />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
