'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Lock, Mail, ShieldCheck, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const { toast } = useToast()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast({ variant: 'destructive', title: 'Access denied', description: 'Invalid email or password.' })
      setLoading(false)
      return
    }
    fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)' }}>

      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px]"
          style={{ background: 'rgba(37,99,235,0.12)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px]"
          style={{ background: 'rgba(124,58,237,0.08)' }} />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full blur-[80px]"
          style={{ background: 'rgba(6,182,212,0.07)' }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo + Brand */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col items-center gap-3 mb-2">
            <div style={{
              background: 'rgba(26,53,102,0.8)',
              borderRadius: '16px',
              padding: '16px 28px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(37,99,235,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Autonex AI" style={{ height: 44, objectFit: 'contain' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#f1f5f9', letterSpacing: '0.18em' }}>
                AUTONEX AI
              </h1>
              <p className="text-[11px] tracking-widest uppercase mt-0.5" style={{ color: 'rgba(148,163,184,0.6)', letterSpacing: '0.12em' }}>
                Automate Today, Lead Tomorrow
              </p>
            </div>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#f1f5f9' }}>Internal Operations</h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(148,163,184,0.6)' }}>Invite-only access. Sign in to your workspace.</p>

          {errorParam === 'access_denied' && (
            <div className="mb-5 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs flex gap-2 items-start leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Access Denied</strong>
                Your account is deactivated or has been removed from this CRM workspace.
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(148,163,184,0.5)' }} />
                <input
                  id="crm-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="hello@autonexai.org"
                  required
                  autoComplete="email"
                  style={{
                    width: '100%', paddingLeft: '2.75rem', paddingRight: '1rem',
                    height: '44px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '14px', outline: 'none', transition: 'all 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(148,163,184,0.5)' }} />
                <input
                  id="crm-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', paddingLeft: '2.75rem', paddingRight: '2.75rem',
                    height: '44px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '14px', outline: 'none', transition: 'all 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(148,163,184,0.5)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="crm-login-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '44px', borderRadius: '12px',
                background: loading ? 'rgba(37,99,235,0.5)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff', fontSize: '14px', fontWeight: '600', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                marginTop: '8px', boxShadow: '0 4px 20px rgba(37,99,235,0.35)', transition: 'all 0.2s',
              }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in…</span></> : <span>Sign In →</span>}
            </button>
          </form>

          <div className="flex items-center justify-between mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <a href="/forgot-password" className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: '#3b82f6' }}>
              Forgot password?
            </a>
            <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
              <ShieldCheck className="w-3 h-3" />
              <span>Secure &amp; encrypted</span>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-[11px] mt-5" style={{ color: 'rgba(148,163,184,0.35)' }}>
          🔒 Invite-only · Autonex AI Technologies
        </p>
      </motion.div>
    </div>
  )
}