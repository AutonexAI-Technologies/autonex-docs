'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?type=recovery&next=/change-password`,
    })
    if (err) setError(err.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)' }}>

      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px]"
          style={{ background: 'rgba(37,99,235,0.12)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full blur-[100px]"
          style={{ background: 'rgba(124,58,237,0.08)' }} />
      </div>
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }} className="relative z-10 w-full max-w-md">

        {/* Logo + Brand */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }} className="text-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <div style={{
              background: 'rgba(26,53,102,0.8)', borderRadius: '16px', padding: '16px 28px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(37,99,235,0.25)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Autonex AI" style={{ height: 44, objectFit: 'contain' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#f1f5f9', letterSpacing: '0.18em' }}>AUTONEX AI</h1>
              <p className="text-[11px] tracking-widest uppercase mt-0.5" style={{ color: 'rgba(148,163,184,0.55)', letterSpacing: '0.12em' }}>Automate Today, Lead Tomorrow</p>
            </div>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '32px', backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}>

          {sent ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: '#60a5fa' }} />
              </div>
              <h2 className="font-semibold text-lg mb-2" style={{ color: '#f1f5f9' }}>Check your inbox</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(148,163,184,0.7)' }}>
                A password reset link has been sent to <strong style={{ color: '#93c5fd' }}>{email}</strong>. It expires in 1 hour.
              </p>
              <Link href="/login" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: '#3b82f6' }}>
                ← Back to Login
              </Link>
            </motion.div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: '#f1f5f9' }}>Reset Password</h2>
              <p className="text-xs mb-6" style={{ color: 'rgba(148,163,184,0.6)' }}>Enter your email and we&apos;ll send a reset link</p>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(148,163,184,0.5)' }} />
                    <input
                      id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="hello@autonexai.org" required
                      style={{
                        width: '100%', paddingLeft: '2.75rem', paddingRight: '1rem', height: '44px',
                        borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontSize: '14px', outline: 'none',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading || !email}
                  style={{
                    width: '100%', height: '44px', borderRadius: '12px',
                    background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff', fontSize: '14px', fontWeight: '600', border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px', marginTop: '8px',
                    boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                  }}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending…</span></> : <span>Send Reset Link →</span>}
                </button>
                <Link href="/login">
                  <button type="button" className="w-full flex items-center justify-center gap-2 text-sm transition-opacity hover:opacity-80 mt-1"
                    style={{ color: 'rgba(148,163,184,0.6)', background: 'none', border: 'none' }}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                  </button>
                </Link>
              </form>
            </>
          )}
        </motion.div>

        <p className="text-center text-[11px] mt-5 flex items-center justify-center gap-1.5"
          style={{ color: 'rgba(148,163,184,0.35)' }}>
          <ShieldCheck className="w-3 h-3" /> Secure · Invite-only · Autonex AI Technologies
        </p>
      </motion.div>
    </div>
  )
}
