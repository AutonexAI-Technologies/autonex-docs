'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Loader2, Lock, Mail, Eye, EyeOff, AlertTriangle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/* ─── Ghost background typography ──────────────────────────────── */
function GhostText() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-start justify-end pointer-events-none select-none overflow-hidden"
      style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 'clamp(100px, 16vw, 220px)',
        lineHeight: 0.88,
        letterSpacing: '0.02em',
        color: 'rgba(240,238,234,0.05)',
        padding: '0 0 -20px 0',
        bottom: '-20px',
      }}
    >
      <span style={{ alignSelf: 'flex-end', paddingRight: '24px' }}>AUTO</span>
      <span style={{ paddingLeft: '24px' }}>NEX</span>
    </div>
  )
}

/* ─── Input component ────────────────────────────────────────────── */
function Field({
  id, type, value, onChange, placeholder, icon: Icon, right, label, autoComplete,
}: {
  id: string; type: string; value: string; onChange: (v: string) => void
  placeholder: string; icon: any; right?: React.ReactNode; label: string; autoComplete?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id}
        style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,238,234,0.45)', marginBottom: '8px', fontFamily: "'Inter', sans-serif" }}>
        {label}
      </label>
      <div className="relative">
        <Icon style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: focused ? 'rgba(240,238,234,0.8)' : 'rgba(240,238,234,0.3)', transition: 'color 0.2s' }} />
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} required autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', paddingLeft: '44px', paddingRight: right ? '44px' : '16px',
            height: '52px', fontFamily: "'Inter', sans-serif", fontSize: '14px',
            background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(240,238,234,0.04)',
            border: focused ? '2px solid rgba(240,238,234,0.4)' : '2px solid rgba(240,238,234,0.1)',
            borderRadius: '4px', color: '#F0EEEA', outline: 'none',
            transition: 'all 0.2s ease',
          }}
        />
        {right && (
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            {right}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main login form ─────────────────────────────────────────────── */
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif" }}
    >
      {/* ─── Left panel: brand / editorial ─── */}
      <div
        className="hidden lg:flex flex-col justify-between"
        style={{
          width: '42%', background: '#1A1A1A', padding: '48px',
          position: 'relative', overflow: 'hidden', flexShrink: 0,
        }}
      >
        <GhostText />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Autonex AI" style={{ height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <div>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', color: '#F0EEEA', letterSpacing: '0.18em', lineHeight: 1 }}>AUTONEX AI</p>
            </div>
          </div>
        </div>

        {/* Bottom copy */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ height: '1px', background: 'rgba(240,238,234,0.12)', marginBottom: '32px' }} />
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(42px,4.5vw,64px)', color: '#F0EEEA', letterSpacing: '0.03em', lineHeight: 0.92, marginBottom: '20px' }}>
            AUTOMATE<br />TODAY.<br />LEAD<br />TOMORROW.
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(240,238,234,0.4)', lineHeight: 1.6 }}>
            Internal Operations Platform<br />
            Invite-only workspace
          </p>
        </div>
      </div>

      {/* ─── Right panel: form ─── */}
      <div
        style={{ flex: 1, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', position: 'relative', overflow: 'hidden' }}
      >
        {/* Subtle noise texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
            backgroundSize: '200px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Autonex AI" style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '16px', color: '#F0EEEA', letterSpacing: '0.18em' }}>AUTONEX AI</p>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '40px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,238,234,0.35)', marginBottom: '12px' }}>
              Team Workspace
            </p>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(42px,5vw,56px)', color: '#F0EEEA', letterSpacing: '0.03em', lineHeight: 0.9, margin: 0 }}>
              SIGN IN
            </h1>
          </div>

          {/* Error banners */}
          <AnimatePresence>
            {(errorParam === 'access_denied' || error) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: '24px' }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '4px' }}>
                  <AlertTriangle style={{ width: '15px', height: '15px', color: '#fca5a5', flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ fontSize: '12px', color: '#fca5a5', lineHeight: 1.5 }}>
                    {errorParam === 'access_denied'
                      ? 'Your account has been deactivated or removed from this workspace.'
                      : error}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field id="crm-email" type="email" value={email} onChange={setEmail}
              placeholder="hello@autonexai.org" icon={Mail} label="Email Address" autoComplete="email" />
            <Field id="crm-password"
              type={showPw ? 'text' : 'password'}
              value={password} onChange={setPassword}
              placeholder="••••••••" icon={Lock} label="Password" autoComplete="current-password"
              right={
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ color: 'rgba(240,238,234,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                </button>
              }
            />

            {/* Forgot password */}
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <a href="/forgot-password"
                style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(240,238,234,0.45)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F0EEEA')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,238,234,0.45)')}
              >
                Forgot password?
              </a>
            </div>

            <motion.button
              id="crm-login-btn"
              type="submit"
              disabled={loading || !email || !password}
              whileHover={{ scale: loading || !email || !password ? 1 : 1.01 }}
              whileTap={{ scale: loading || !email || !password ? 1 : 0.98 }}
              style={{
                height: '52px', width: '100%', marginTop: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                background: loading || !email || !password ? 'rgba(240,238,234,0.15)' : '#F0EEEA',
                color: loading || !email || !password ? 'rgba(240,238,234,0.4)' : '#1A1A1A',
                border: 'none', borderRadius: '4px',
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {loading
                ? <><Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /><span>Signing in…</span></>
                : <><span>Sign In</span><ArrowRight style={{ width: '15px', height: '15px' }} /></>
              }
            </motion.button>
          </form>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(240,238,234,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(240,238,234,0.2)' }}>
              INVITE-ONLY · AUTONEX AI TECHNOLOGIES © 2025
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1A1A' }}>
        <Loader2 style={{ width: '24px', height: '24px', color: '#F0EEEA', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
