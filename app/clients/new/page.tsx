import ClientForm from '@/components/ClientForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewClientPage() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Clients
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="page-header">Add New Client</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Fill in the details below. All 4 documents (Contract · Welcome · Invoice · Thank You) will be auto-populated.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-[#0d1a35]/60 border border-white/5 rounded-2xl p-6 sm:p-8">
        <ClientForm />
      </div>
    </div>
  )
}
