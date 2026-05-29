'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Building2, Scale, CreditCard, Mail, Wrench, Bell, Shield,
  ChevronRight, Save, Loader2, IndianRupee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_SERVICES } from '@/types'
import { useToast } from '@/hooks/use-toast'

const sections = [
  { id: 'branding', label: 'Branding', icon: Building2, desc: 'Company name, logo, tagline, website' },
  { id: 'legal', label: 'Legal Details', icon: Scale, desc: 'GST, PAN, registered address' },
  { id: 'payment', label: 'Payment Details', icon: CreditCard, desc: 'Bank, IFSC, UPI — auto-fills invoices' },
  { id: 'email', label: 'Email Config', icon: Mail, desc: 'From name, reply-to, signature' },
  { id: 'services', label: 'Service Rates', icon: Wrench, desc: 'Default setup and retainer rates' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Per-user notification preferences' },
  { id: 'security', label: 'Security', icon: Shield, desc: 'Sessions, change password' },
]

export default function SettingsPage() {
  const { toast } = useToast()
  const [active, setActive] = useState('branding')
  const [saving, setSaving] = useState(false)
  const [branding, setBranding] = useState({
    company_name: 'Autonex AI Technologies',
    tagline: 'Automate Today. Lead Tomorrow.',
    website: 'autonexai.org',
  })
  const [legal, setLegal] = useState({
    registered_address: '',
    gst_number: '',
    pan_number: '',
  })
  const [payment, setPayment] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
  })
  const [emailConfig, setEmailConfig] = useState({
    from_name: 'Autonex AI Technologies',
    reply_to: 'hello@autonexai.org',
    signature: '',
  })
  const [serviceRates, setServiceRates] = useState(
    DEFAULT_SERVICES.slice(0, 8).map(s => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      setup_fee: s.default_setup_fee,
      retainer_fee: s.default_retainer_fee,
    }))
  )

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    toast({ title: '✅ Settings saved!', description: 'Changes will apply to future clients only.' })
    setSaving(false)
  }

  const inputClass = 'h-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:border-blue-500/50 text-sm'
  const labelClass = 'text-slate-400 text-xs mb-1.5 block'

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Settings sidebar */}
      <div className="w-56 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto scrollbar-thin py-4">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActive(section.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              active === section.id
                ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <section.icon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-8 py-8 max-w-2xl">
          {/* Branding */}
          {active === 'branding' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Branding</h2>
              <p className="text-slate-400 text-sm mb-6">Appears on all generated PDFs and emails.</p>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Company Name</label>
                  <Input value={branding.company_name} onChange={e => setBranding(p => ({ ...p, company_name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tagline</label>
                  <Input value={branding.tagline} onChange={e => setBranding(p => ({ ...p, tagline: e.target.value }))} className={inputClass} placeholder="Your company tagline" />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <Input value={branding.website} onChange={e => setBranding(p => ({ ...p, website: e.target.value }))} className={inputClass} placeholder="autonexai.org" />
                </div>
                <div className="pt-2">
                  <label className={labelClass}>Logo (URL)</label>
                  <Input className={inputClass} placeholder="https://..." />
                  <p className="text-slate-600 text-xs mt-1">High-res PNG recommended for PDF headers</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Legal Details */}
          {active === 'legal' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Legal Details</h2>
              <p className="text-slate-400 text-sm mb-6">Shown on invoices and contracts. Required for GST compliance.</p>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Registered Address</label>
                  <textarea
                    value={legal.registered_address}
                    onChange={e => setLegal(p => ({ ...p, registered_address: e.target.value }))}
                    className="w-full h-24 px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-slate-400"
                    placeholder="Registered address with city, state, PIN..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>GST Number</label>
                    <Input value={legal.gst_number} onChange={e => setLegal(p => ({ ...p, gst_number: e.target.value }))} className={inputClass} placeholder="29XXXXX1234X1Z5" />
                  </div>
                  <div>
                    <label className={labelClass}>PAN Number</label>
                    <Input value={legal.pan_number} onChange={e => setLegal(p => ({ ...p, pan_number: e.target.value }))} className={inputClass} placeholder="XXXXX1234X" />
                  </div>
                </div>
                <div className="px-4 py-3 rounded-xl border border-blue-500/15 bg-blue-500/5 text-xs text-slate-400">
                  ⚖️ Jurisdiction: Hyderabad, Telangana, India · Governed by Indian Contract Act, 1872 · IT Act, 2000
                </div>
              </div>
            </motion.div>
          )}

          {/* Payment Details */}
          {active === 'payment' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Payment Details</h2>
              <p className="text-slate-400 text-sm mb-6">Auto-fills on every invoice. Update once — applies everywhere.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <Input value={payment.bank_name} onChange={e => setPayment(p => ({ ...p, bank_name: e.target.value }))} className={inputClass} placeholder="HDFC Bank" />
                  </div>
                  <div>
                    <label className={labelClass}>Account Number</label>
                    <Input value={payment.account_number} onChange={e => setPayment(p => ({ ...p, account_number: e.target.value }))} className={inputClass} placeholder="1234567890" />
                  </div>
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <Input value={payment.ifsc_code} onChange={e => setPayment(p => ({ ...p, ifsc_code: e.target.value }))} className={inputClass} placeholder="HDFC0001234" />
                  </div>
                  <div>
                    <label className={labelClass}>UPI ID</label>
                    <Input value={payment.upi_id} onChange={e => setPayment(p => ({ ...p, upi_id: e.target.value }))} className={inputClass} placeholder="autonex@hdfc" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Email Config */}
          {active === 'email' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Email Configuration</h2>
              <p className="text-slate-400 text-sm mb-6">Configure how emails appear to clients. Uses Resend.</p>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>From Name</label>
                  <Input value={emailConfig.from_name} onChange={e => setEmailConfig(p => ({ ...p, from_name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Reply-to Email</label>
                  <Input value={emailConfig.reply_to} onChange={e => setEmailConfig(p => ({ ...p, reply_to: e.target.value }))} className={inputClass} type="email" />
                </div>
                <div>
                  <label className={labelClass}>Email Signature</label>
                  <textarea
                    value={emailConfig.signature}
                    onChange={e => setEmailConfig(p => ({ ...p, signature: e.target.value }))}
                    className="w-full h-24 px-3 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-xl focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-slate-400"
                    placeholder="Best regards,&#10;Team Autonex AI"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Service Rates */}
          {active === 'services' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Default Service Rates</h2>
              <p className="text-slate-400 text-sm mb-2">Changes apply to future clients only. Existing clients are unaffected.</p>
              <div className="mb-6 px-4 py-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5 text-amber-400 text-xs">
                ⚠️ Each client's rate can be overridden individually during intake. These are just defaults.
              </div>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 px-4 py-3 bg-white/[0.02] border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <span>Service</span>
                  <span>Setup Fee (₹)</span>
                  <span>Monthly Retainer (₹)</span>
                </div>
                {serviceRates.map((svc, i) => (
                  <div key={svc.id} className="grid grid-cols-[2fr_1fr_1fr] gap-4 items-center px-4 py-3 border-b border-slate-100 last:border-0">
                    <span className="text-slate-300 text-sm flex items-center gap-2">
                      <span>{svc.emoji}</span>
                      <span className="truncate">{svc.name}</span>
                    </span>
                    <input
                      type="number"
                      value={svc.setup_fee}
                      onChange={e => setServiceRates(prev => prev.map((s, idx) => idx === i ? { ...s, setup_fee: Number(e.target.value) } : s))}
                      className="h-8 px-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:outline-none focus:border-blue-500/50 w-full"
                    />
                    <input
                      type="number"
                      value={svc.retainer_fee}
                      onChange={e => setServiceRates(prev => prev.map((s, idx) => idx === i ? { ...s, retainer_fee: Number(e.target.value) } : s))}
                      className="h-8 px-2.5 bg-white border border-slate-200 text-slate-900 text-sm rounded-lg focus:outline-none focus:border-blue-500/50 w-full"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Security */}
          {active === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Security</h2>
              <p className="text-slate-400 text-sm mb-6">Manage your session and password.</p>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-900 text-sm font-medium mb-1">Change Password</p>
                  <p className="text-slate-500 text-xs mb-4">A reset link will be sent to your registered email.</p>
                  <Button variant="outline" className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm h-9 px-4 rounded-xl">
                    Send Reset Link
                  </Button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-slate-900 text-sm font-medium mb-1">Active Sessions</p>
                  <p className="text-slate-500 text-xs mb-4">You are currently signed in on this device.</p>
                  <Button variant="outline" className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/5 text-sm h-9 px-4 rounded-xl">
                    Sign Out All Devices
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Notifications in settings */}
          {active === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-slate-900 font-bold text-lg mb-1">Notification Preferences</h2>
              <p className="text-slate-400 text-sm mb-6">Per-user control. These are your personal preferences.</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {[
                  'New client added',
                  'Retainer invoice due',
                  'Invoice overdue',
                  'Document sent to client',
                  'New team member joined',
                ].map(pref => (
                  <div key={pref} className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 last:border-0">
                    <span className="text-slate-300 text-sm">{pref}</span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-blue-500" />
                        In-app
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-blue-500" />
                        Email
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Save button */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="anx-gradient text-white font-semibold gap-2 h-10 px-6 rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-90"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
