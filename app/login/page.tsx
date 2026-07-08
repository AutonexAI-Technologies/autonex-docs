'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ShieldCheck, BarChart3, Users } from 'lucide-react'

function LoginForm() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const errorParam = searchParams.get('error')
  const displayError = error || (errorParam === 'access_denied' ? 'You do not have access to this platform.' : '')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }
    fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <AnimatePresence>
        {displayError && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg text-[12px]"
              style={{ background: 'var(--error-bg)', border: '1px solid rgba(255,59,48,0.2)', color: 'var(--error)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{displayError}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email */}
      <div>
        <label htmlFor="crm-email" className="block text-[11px] font-semibold uppercase tracking-[0.07em] mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            id="crm-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
            autoComplete="email"
            className="input input-lg w-full pl-10"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="crm-password" className="block text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: 'var(--text-tertiary)' }}>
            Password
          </label>
          <Link href="/forgot-password" className="text-[12px] font-medium transition-opacity" style={{ color: 'var(--accent)' }}
            onMouseEnter={(e: any) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e: any) => e.currentTarget.style.opacity = '1'}
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            id="crm-password"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password"
            required
            autoComplete="current-password"
            className="input input-lg w-full pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={!email || !password || loading}
        whileHover={{ scale: !email || !password || loading ? 1 : 1.01 }}
        whileTap={{ scale: !email || !password || loading ? 1 : 0.99 }}
        className="btn btn-primary btn-lg w-full mt-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
        ) : (
          <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
        )}
      </motion.button>
    </form>
  )
}

const FEATURES = [
  { icon: Users,      label: 'Client Management',  desc: 'Track all clients in one place' },
  { icon: BarChart3,  label: 'Revenue Analytics',  desc: 'Real-time financial insights' },
  { icon: ShieldCheck,label: 'Role-Based Access',  desc: 'Secure, permission-controlled' },
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font)' }}>

      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 w-[420px] xl:w-[480px] shrink-0"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Autonex AI" className="h-9 w-auto object-contain" style={{ filter: 'brightness(1)' }} />
          <div>
            <p className="text-white font-semibold text-[15px] leading-tight tracking-[-0.01em]">Autonex AI</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--sidebar-label)' }}>Operations Platform</p>
          </div>
        </div>

        {/* Main copy */}
        <div>
          <h1
            className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-[-0.03em] mb-5"
          >
            Your command<br />center for client<br />operations.
          </h1>
          <p className="text-[15px] leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Manage clients, invoices, documents, and your team — all in one secure workspace.
          </p>

          {/* Feature chips */}
          <div className="space-y-3">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.15)' }}
                >
                  <f.icon className="w-4 h-4" style={{ color: '#93C5FD' }} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-white">{f.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--sidebar-label)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px]" style={{ color: 'var(--sidebar-label)' }}>
          © {new Date().getFullYear()} Autonex AI. Invite-only platform.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: 'var(--page-bg)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[380px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/logo.png" alt="Autonex AI" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>Autonex AI</span>
          </div>

          <div className="mb-7">
            <h2
              className="text-[26px] font-bold tracking-[-0.03em] mb-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back
            </h2>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              Sign in to your operations workspace.
            </p>
          </div>

          <Suspense fallback={<div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} /></div>}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-[12px] mt-6" style={{ color: 'var(--text-tertiary)' }}>
            Access is invite-only. Contact your administrator.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
