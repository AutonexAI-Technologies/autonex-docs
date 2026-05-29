'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import DocumentCard from '@/components/DocumentCard'
import { Client, DOCUMENTS, ClientStatus } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, User, Mail, Phone, Building2, Briefcase,
  IndianRupee, CalendarDays, Loader2, Sparkles, RefreshCw,
  Edit, StickyNote,
  // Tab icons
  Milestone, MessageSquare, FolderOpen, ClipboardList,
  LifeBuoy, Activity, Heart, Users, Send, ExternalLink, Check,
} from 'lucide-react'
import { format } from 'date-fns'

// Sub-page components
import TimelinePage from './timeline/page'
import NotesPage from './notes/page'
import HealthPage from './health/page'
import SupportPage from './support/page'
import FilesPage from './files/page'
import OnboardingPage from './onboarding/page'
import ClientMessagesPage from './messages/page'
import ClientActivityPage from './activity/page'
import TeamPage from './team/page'

const statusStyles: Record<ClientStatus, string> = {
  Lead: 'badge badge-violet',
  Active: 'badge badge-green',
  Completed: 'badge badge-blue',
  'On Hold': 'badge badge-yellow',
  Cancelled: 'badge badge-red',
}

// Pipeline status styles (lowercase)
const pipelineStatusStyles: Record<string, string> = {
  lead:            'badge badge-violet',
  proposal_sent:   'badge badge-blue',
  contract_signed: 'badge badge-blue',
  active:          'badge badge-green',
  review:          'badge badge-yellow',
  completed:       'badge badge-blue',
  paused:          'badge badge-yellow',
  cancelled:       'badge badge-red',
}

const TABS = [
  { key: 'overview',    label: 'Overview',    icon: User },
  { key: 'timeline',    label: 'Timeline',    icon: Milestone },
  { key: 'messages',    label: 'Messages',    icon: MessageSquare },
  { key: 'files',       label: 'Files',       icon: FolderOpen },
  { key: 'onboarding',  label: 'Onboarding',  icon: ClipboardList },
  { key: 'support',     label: 'Support',     icon: LifeBuoy },
  { key: 'portal',      label: 'Portal',      icon: Users },
  { key: 'notes',       label: 'Notes',       icon: StickyNote },
  { key: 'health',      label: 'Health',      icon: Heart },
  { key: 'activity',    label: 'Activity',    icon: Activity },
]

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

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

  async function handleSendPortalInvite() {
    if (!client || sendingInvite) return
    setSendingInvite(true)
    try {
      const res = await fetch('/api/portal/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, email: client.email, name: client.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Invite failed', description: data.error })
      } else {
        setInviteSent(true)
        toast({ title: '✉️ Portal invite sent!', description: `Invite sent to ${client.email}` })
        setTimeout(() => setInviteSent(false), 4000)
      }
    } catch {
      toast({ variant: 'destructive', title: 'Network error' })
    }
    setSendingInvite(false)
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

  // Try pipeline status first, fall back to legacy
  const statusBadge =
    pipelineStatusStyles[client.status?.toLowerCase() ?? ''] ??
    statusStyles[client.status as ClientStatus] ??
    'badge badge-slate'

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-6 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Clients
      </Link>

      {/* Client Info Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0">
              <span className="text-blue-400 font-bold text-lg">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
                <span className={statusBadge}>
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

          {/* Actions */}
          <div className="text-right flex flex-col items-end gap-2">
            <div>
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
            <button
              onClick={handleSendPortalInvite}
              disabled={sendingInvite}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                inviteSent
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/15'
              }`}
            >
              {sendingInvite ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : inviteSent ? (
                <Check className="w-3 h-3" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              {inviteSent ? 'Invite Sent!' : 'Send Portal Invite'}
            </button>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
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
      </motion.div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-thin border-b border-slate-200">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-all rounded-t-lg ${
                isActive
                  ? 'text-blue-400 bg-blue-500/8'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-600'}`} />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <>
            {/* Payment details */}
            {(client.bank_name || client.upi_id) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Payment Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {client.bank_name && <div><span className="text-slate-500">Bank:</span> <span className="text-white ml-1">{client.bank_name}</span></div>}
                  {client.account_number && <div><span className="text-slate-500">Account:</span> <span className="text-white ml-1">{client.account_number}</span></div>}
                  {client.ifsc_code && <div><span className="text-slate-500">IFSC:</span> <span className="text-white ml-1">{client.ifsc_code}</span></div>}
                  {client.upi_id && <div><span className="text-slate-500">UPI:</span> <span className="text-white ml-1">{client.upi_id}</span></div>}
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 flex items-start gap-2">
                <StickyNote className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-slate-400 text-xs">{client.notes}</p>
              </div>
            )}

            {/* Documents */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Documents</h2>
                <p className="text-slate-500 text-xs mt-0.5">Generate, download, or email each document independently</p>
              </div>
              <Button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                variant="outline"
                className="border-slate-200 text-slate-300 hover:text-white hover:bg-slate-50 rounded-xl h-9 px-4 text-sm gap-2"
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
          </>
        )}
        {activeTab === 'timeline' && <TimelinePage />}
        {activeTab === 'messages' && <ClientMessagesPage />}
        {activeTab === 'files' && <FilesPage />}
        {activeTab === 'onboarding' && <OnboardingPage />}
        {activeTab === 'support' && <SupportPage />}
        {activeTab === 'portal' && <TeamPage />}
        {activeTab === 'notes' && <NotesPage />}
        {activeTab === 'health' && <HealthPage />}
        {activeTab === 'activity' && <ClientActivityPage />}
      </motion.div>
    </div>
  )
}
