'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 w-[400px] shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Autonex AI" className="h-9 w-auto object-contain" />
          <div>
            <p className="text-white font-semibold text-[15px]">Autonex AI</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--sidebar-label)' }}>Operations Platform</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-[1.1] tracking-[-0.03em] mb-4">Reset your password.</h1>
          <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Enter your email and we'll send a secure reset link.
          </p>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--sidebar-label)' }}>© {new Date().getFullYear()} Autonex AI</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: 'var(--page-bg)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px]"
        >
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[12px] mb-8 transition-opacity" style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e: any) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e: any) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.2)' }}>
                  <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--success)' }} />
                </div>
                <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-2" style={{ color: 'var(--text-primary)' }}>Check your inbox</h2>
                <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  We sent a reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. It expires in 1 hour.
                </p>
                <Link href="/login">
                  <button className="btn btn-secondary btn-lg w-full">Back to sign in</button>
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-7">
                  <h2 className="text-[26px] font-bold tracking-[-0.03em] mb-1.5" style={{ color: 'var(--text-primary)' }}>Forgot password?</h2>
                  <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Enter your work email to receive a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-start gap-2.5 p-3 rounded-lg text-[12px]" style={{ background: 'var(--error-bg)', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--error)' }}>
                          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{error}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label htmlFor="reset-email" className="block text-[11px] font-semibold uppercase tracking-[0.07em] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                      <input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required autoComplete="email" className="input input-lg w-full pl-10" />
                    </div>
                  </div>

                  <motion.button type="submit" disabled={!email || loading}
                    whileHover={{ scale: !email || loading ? 1 : 1.01 }} whileTap={{ scale: !email || loading ? 1 : 0.99 }}
                    className="btn btn-primary btn-lg w-full">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
