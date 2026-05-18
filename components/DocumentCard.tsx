'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Send, Loader2, CheckCircle, RefreshCw } from 'lucide-react'
import { Client, DocumentMeta } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface Props {
  doc: DocumentMeta
  client: Client
  index: number
}

export default function DocumentCard({ doc, client, index }: Props) {
  const { toast } = useToast()
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  async function handleGenerate() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/generate/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${doc.id}-${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setDownloaded(true)
      toast({ title: `✅ ${doc.title} downloaded!` })
      setTimeout(() => setDownloaded(false), 3000)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setDownloading(false)
    }
  }

  const docColors = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500/15', text: 'text-blue-400', btn: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/15' },
    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', text: 'text-emerald-400', btn: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/15' },
    { bg: 'bg-violet-500/10', border: 'border-violet-500/15', text: 'text-violet-400', btn: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/15' },
    { bg: 'bg-amber-500/10', border: 'border-amber-500/15', text: 'text-amber-400', btn: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/15' },
  ]

  const colors = docColors[index % docColors.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -2 }}
      className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 flex flex-col gap-4 transition-shadow hover:shadow-lg`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center text-xl shrink-0`}>
          {doc.icon}
        </div>
        <div className="min-w-0">
          <p className={`font-semibold text-sm ${colors.text}`}>{doc.title}</p>
          <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{doc.description}</p>
        </div>
      </div>

      {/* Indian law compliance note for contract */}
      {doc.id === 'contract' && (
        <p className="text-slate-600 text-[10px] flex items-center gap-1">
          ⚖️ Indian Contract Act, 1872 · Hyderabad jurisdiction
        </p>
      )}
      {doc.id === 'invoice' && (
        <p className="text-slate-600 text-[10px] flex items-center gap-1">
          🧾 ANX-XXX format · GST compliant · MSME norms
        </p>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={downloading}
        className={`flex items-center justify-center gap-2 w-full h-9 rounded-xl border text-xs font-medium transition-colors disabled:opacity-60 ${colors.btn}`}
      >
        {downloading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
        ) : downloaded ? (
          <><CheckCircle className="w-3.5 h-3.5" /> Downloaded!</>
        ) : (
          <><Download className="w-3.5 h-3.5" /> Download PDF</>
        )}
      </button>
    </motion.div>
  )
}
