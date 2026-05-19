'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_SERVICES, ServiceType } from '@/types'
import { Loader2, ChevronDown, Calculator, RefreshCw, Zap, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { validateStep, validateField, type FieldErrors } from '@/lib/validations/client'

interface FormData {
  name: string
  email: string
  phone: string
  company: string
  service: string
  total_fee: string
  start_date: string
  status: string
  project_type: 'one-time' | 'retainer'
  notes: string
  bank_name: string
  account_number: string
  ifsc_code: string
  upi_id: string
}

const initialForm: FormData = {
  name: '', email: '', phone: '', company: '',
  service: '', total_fee: '', start_date: '',
  status: 'Lead', project_type: 'one-time', notes: '',
  bank_name: '', account_number: '', ifsc_code: '', upi_id: '',
}

const STEPS = [
  { num: 1, label: 'Client Info', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
  { num: 2, label: 'Project Details', color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/25' },
  { num: 3, label: 'Payment', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
]

const CLIENT_STATUSES = ['Lead', 'Active', 'Completed', 'On Hold', 'Cancelled']

export default function ClientForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<FormData>(initialForm)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const selectedService = DEFAULT_SERVICES.find(s => s.name === form.service)
  const isRetainer = form.project_type === 'retainer'
  const deposit = form.total_fee ? Math.round(Number(form.total_fee) * 0.5) : 0

  function handleChange(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handleBlur(field: keyof FormData) {
    const error = validateField(step, field, form[field], form)
    setFieldErrors(prev => {
      if (error) return { ...prev, [field]: error }
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleServiceSelect(svc: ServiceType) {
    const fee = isRetainer ? svc.default_retainer_fee : svc.default_setup_fee
    setForm(prev => ({
      ...prev,
      service: svc.name,
      total_fee: svc.is_custom ? '' : fee.toString(),
    }))
    setServiceOpen(false)
    // Clear service error
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next['service']
      return next
    })
  }

  function handleProjectTypeChange(type: 'one-time' | 'retainer') {
    setForm(prev => {
      const fee = selectedService
        ? (type === 'retainer' ? selectedService.default_retainer_fee : selectedService.default_setup_fee)
        : 0
      return { ...prev, project_type: type, total_fee: fee ? fee.toString() : prev.total_fee }
    })
  }

  function goToStep(target: number) {
    // Validate current step before advancing
    if (target > step) {
      const errors = validateStep(step, form)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        toast({ variant: 'destructive', title: 'Please fix the errors before continuing.' })
        return
      }
    }
    setFieldErrors({})
    setStep(target)
  }

  async function checkDuplicate(email: string) {
    if (!email) return
    const res = await fetch(`/api/clients?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    setDuplicateWarning(Array.isArray(data) && data.some((c: any) => c.email === email))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate step 3 before submit
    const errors = validateStep(3, form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast({ variant: 'destructive', title: 'Please fix the errors before submitting.' })
      return
    }

    if (!form.service) {
      toast({ variant: 'destructive', title: 'Please select a service type.' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          total_fee: Number(form.total_fee),
          deposit_fee: deposit,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save client.')
      toast({ title: '✅ Client saved!', description: `${form.name} added successfully.` })
      router.push(`/clients/${data.id}`)
      router.refresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'input-dark h-11 px-3 w-full border focus:outline-none focus:ring-0'
  const inputErrorClass = 'input-dark h-11 px-3 w-full border focus:outline-none focus:ring-0 !border-red-500/50'
  const labelClass = 'text-slate-400 text-sm font-medium mb-1.5 block'

  /** Inline error message component */
  function FieldError({ field }: { field: string }) {
    const msg = fieldErrors[field]
    if (!msg) return null
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1.5 mt-1.5 text-red-400 text-xs"
      >
        <AlertCircle className="w-3 h-3 shrink-0" />
        {msg}
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-2">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step > s.num && goToStep(s.num)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                step === s.num
                  ? `${s.bg} ${s.border} ${s.color}`
                  : step > s.num
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-pointer'
                  : 'bg-white/5 border-white/10 text-slate-500 cursor-default'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step > s.num ? 'bg-emerald-500 text-white' : ''
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* STEP 1 — Client Info */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name <span className="text-blue-400">*</span></label>
              <Input id="name" placeholder="Rahul Sharma" value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                required
                className={fieldErrors.name ? inputErrorClass : inputClass} />
              <FieldError field="name" />
            </div>
            <div>
              <label className={labelClass}>Email Address <span className="text-blue-400">*</span></label>
              <Input id="email" type="email" placeholder="rahul@company.com" value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                onBlur={e => { handleBlur('email'); checkDuplicate(e.target.value) }}
                required className={fieldErrors.email ? inputErrorClass : inputClass} />
              <FieldError field="email" />
              {duplicateWarning && !fieldErrors.email && (
                <div className="flex items-center gap-1.5 mt-1.5 text-amber-400 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  A client with this email already exists.
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <Input placeholder="+91 9876543210" value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                className={fieldErrors.phone ? inputErrorClass : inputClass} />
              <FieldError field="phone" />
              <p className="text-slate-600 text-[11px] mt-1">Include country code (e.g. +91, +1, +44)</p>
            </div>
            <div>
              <label className={labelClass}>Company Name</label>
              <Input placeholder="Acme Corp" value={form.company}
                onChange={e => handleChange('company', e.target.value)}
                onBlur={() => handleBlur('company')}
                className={fieldErrors.company ? inputErrorClass : inputClass} />
              <FieldError field="company" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Client Status</label>
            <div className="flex gap-2 flex-wrap">
              {CLIENT_STATUSES.map(s => (
                <button key={s} type="button"
                  onClick={() => handleChange('status', s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    form.status === s
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Notes visible only to the team — client never sees this..."
              className="w-full h-20 px-3 py-2.5 bg-[#0d1a35] border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-slate-600"
            />
          </div>
          <Button type="button" onClick={() => goToStep(2)}
            disabled={!form.name || !form.email}
            className="w-full h-11 anx-gradient text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40">
            Continue to Project Details →
          </Button>
        </motion.div>
      )}

      {/* STEP 2 — Project Details */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          {/* Project type toggle */}
          <div>
            <label className={labelClass}>Project Type</label>
            <div className="flex gap-3">
              {(['one-time', 'retainer'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => handleProjectTypeChange(type)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.project_type === type
                      ? type === 'retainer'
                        ? 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                        : 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'retainer' ? <RefreshCw className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                  {type === 'retainer' ? 'Monthly Retainer' : 'One-time Project'}
                </button>
              ))}
            </div>
            {isRetainer && (
              <p className="text-violet-400 text-xs mt-2 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                Monthly retainer billing — reminders auto-generated each cycle
              </p>
            )}
          </div>

          {/* Service selector */}
          <div>
            <label className={labelClass}>Service Type <span className="text-blue-400">*</span></label>
            <div className="relative">
              <button type="button" onClick={() => setServiceOpen(!serviceOpen)}
                className={`w-full flex items-center justify-between px-3 h-11 rounded-xl border bg-[#0d1a35] text-left transition-colors ${
                  form.service ? 'text-white' : 'text-slate-600'
                } ${fieldErrors.service ? 'border-red-500/50' : 'border-white/10 hover:border-blue-500/30'}`}
              >
                <span className="flex items-center gap-2 text-sm">
                  {selectedService && <span>{selectedService.emoji}</span>}
                  {form.service || 'Select a service...'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${serviceOpen ? 'rotate-180' : ''}`} />
              </button>
              <FieldError field="service" />
              <AnimatePresence>
                {serviceOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#0d1a35] shadow-xl overflow-hidden"
                  >
                    {DEFAULT_SERVICES.map(svc => (
                      <button key={svc.id} type="button"
                        onClick={() => handleServiceSelect(svc)}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-blue-500/10 ${
                          form.service === svc.name ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{svc.emoji}</span>
                          <div>
                            <p className="text-sm font-medium">{svc.name}</p>
                            <p className="text-xs text-slate-500">
                              {svc.is_custom ? 'Enter amount manually' : `Setup: ₹${svc.default_setup_fee.toLocaleString('en-IN')} · Retainer: ₹${svc.default_retainer_fee.toLocaleString('en-IN')}/mo`}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {isRetainer ? 'Monthly Retainer Amount (₹)' : 'Total Fee (₹)'}
                <span className="text-blue-400"> *</span>
              </label>
              <Input type="number" placeholder="25000" value={form.total_fee}
                onChange={e => handleChange('total_fee', e.target.value)}
                onBlur={() => handleBlur('total_fee')}
                required className={fieldErrors.total_fee ? inputErrorClass : inputClass} />
              <FieldError field="total_fee" />
              {selectedService && !selectedService.is_custom && (
                <p className="text-slate-500 text-xs mt-1">
                  Default {isRetainer ? 'retainer' : 'setup'}: ₹{(isRetainer ? selectedService.default_retainer_fee : selectedService.default_setup_fee).toLocaleString('en-IN')} — editable above
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Project Start Date</label>
              <Input type="date" value={form.start_date}
                onChange={e => handleChange('start_date', e.target.value)}
                className={`${inputClass} [color-scheme:dark]`} />
            </div>
          </div>

          {/* 50% deposit calculator */}
          <AnimatePresence>
            {form.total_fee && Number(form.total_fee) > 0 && !isRetainer && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <Calculator className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <span className="text-slate-400 text-sm">50% Deposit: </span>
                    <span className="text-blue-400 font-bold text-sm">₹{deposit.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-slate-600 text-xs">
                    Remaining: ₹{(Number(form.total_fee) - deposit).toLocaleString('en-IN')} on completion
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <Button type="button" onClick={() => goToStep(1)} variant="ghost"
              className="flex-1 h-11 text-slate-400 border border-white/10 rounded-xl hover:text-white">
              ← Back
            </Button>
            <Button type="button" onClick={() => goToStep(3)}
              disabled={!form.service || !form.total_fee}
              className="flex-[2] h-11 anx-gradient text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40">
              Continue to Payment →
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 3 — Payment Details */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <p className="text-slate-500 text-sm">
            Payment details are for the <strong className="text-slate-300">Invoice PDF</strong>. These auto-fill from Settings if configured.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bank Name</label>
              <Input placeholder="HDFC Bank" value={form.bank_name}
                onChange={e => handleChange('bank_name', e.target.value)}
                onBlur={() => handleBlur('bank_name')}
                className={fieldErrors.bank_name ? inputErrorClass : inputClass} />
              <FieldError field="bank_name" />
            </div>
            <div>
              <label className={labelClass}>Account Number</label>
              <Input placeholder="1234567890 or IBAN" value={form.account_number}
                onChange={e => handleChange('account_number', e.target.value)}
                onBlur={() => handleBlur('account_number')}
                className={fieldErrors.account_number ? inputErrorClass : inputClass} />
              <FieldError field="account_number" />
              <p className="text-slate-600 text-[11px] mt-1">Supports Indian, IBAN, and international formats</p>
            </div>
            <div>
              <label className={labelClass}>IFSC / SWIFT / Sort Code</label>
              <Input placeholder="HDFC0001234 or HDFCINBB" value={form.ifsc_code}
                onChange={e => handleChange('ifsc_code', e.target.value)}
                onBlur={() => handleBlur('ifsc_code')}
                className={fieldErrors.ifsc_code ? inputErrorClass : inputClass} />
              <FieldError field="ifsc_code" />
            </div>
            <div>
              <label className={labelClass}>UPI ID</label>
              <Input placeholder="autonex@hdfc" value={form.upi_id}
                onChange={e => handleChange('upi_id', e.target.value)}
                onBlur={() => handleBlur('upi_id')}
                className={fieldErrors.upi_id ? inputErrorClass : inputClass} />
              <FieldError field="upi_id" />
            </div>
          </div>

          {/* Summary preview */}
          <div className="rounded-xl border border-white/5 bg-[#0a1628]/60 p-4 space-y-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">Client Summary</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Name:</span> <span className="text-white ml-1">{form.name}</span></div>
              <div><span className="text-slate-500">Email:</span> <span className="text-white ml-1">{form.email}</span></div>
              <div><span className="text-slate-500">Service:</span> <span className="text-white ml-1">{selectedService?.emoji} {form.service}</span></div>
              <div><span className="text-slate-500">Type:</span> <span className={`ml-1 font-medium ${isRetainer ? 'text-violet-400' : 'text-blue-400'}`}>{isRetainer ? 'Retainer' : 'One-time'}</span></div>
              <div><span className="text-slate-500">{isRetainer ? 'Monthly:' : 'Total:'}</span> <span className="text-emerald-400 font-semibold ml-1">₹{Number(form.total_fee).toLocaleString('en-IN')}</span></div>
              {!isRetainer && <div><span className="text-slate-500">Deposit:</span> <span className="text-blue-400 font-semibold ml-1">₹{deposit.toLocaleString('en-IN')}</span></div>}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" onClick={() => goToStep(2)} variant="ghost"
              className="flex-1 h-11 text-slate-400 border border-white/10 rounded-xl hover:text-white">
              ← Back
            </Button>
            <Button type="submit" disabled={loading}
              className="flex-[2] h-12 anx-gradient text-white font-bold text-base rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/20 disabled:opacity-60">
              {loading ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving Client...</>
              ) : (
                '✅ Save Client & Continue →'
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </form>
  )
}
