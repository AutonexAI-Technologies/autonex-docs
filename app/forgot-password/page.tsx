'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [focused, setFocused] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
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
    <div
      style={{ minHeight: '100vh', display: 'flex', background: '#1A1A1A', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}
    >
      {/* Ghost text */}
      <div
        aria-hidden
        style={{
          position: 'absolute', bottom: '-10px', right: '24px',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(100px, 15vw, 200px)',
          lineHeight: 0.88, letterSpacing: '0.02em', color: 'rgba(240,238,234,0.04)',
          pointerEvents: 'none', userSelect: 'none',
        }}
      >
        RESET
      </div>

      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', position: 'relative', zIndex: 1 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: '400px' }}
        >
          {/* Back */}
          <Link href="/login"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,238,234,0.4)', marginBottom: '48px', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F0EEEA')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,238,234,0.4)')}
          >
            <ArrowLeft style={{ width: '13px', height: '13px' }} />
            Back to Login
          </Link>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ textAlign: 'center', padding: '48px 0' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(240,238,234,0.07)', border: '1px solid rgba(240,238,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle style={{ width: '26px', height: '26px', color: '#F0EEEA' }} />
                </div>
                <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '48px', color: '#F0EEEA', letterSpacing: '0.04em', lineHeight: 0.92, marginBottom: '16px' }}>
                  CHECK YOUR INBOX
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(240,238,234,0.5)', lineHeight: 1.6, marginBottom: '6px' }}>Reset link sent to</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#F0EEEA', marginBottom: '32px' }}>{email}</p>
                <p style={{ fontSize: '11px', color: 'rgba(240,238,234,0.3)', lineHeight: 1.6 }}>Didn't receive it? Check your spam folder. Link expires in 1 hour.</p>
                <Link href="/login"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(240,238,234,0.4)', marginTop: '32px', textDecoration: 'none' }}
                >
                  <ArrowLeft style={{ width: '13px', height: '13px' }} />
                  Return to Login
                </Link>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Heading */}
                <div style={{ marginBottom: '40px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(240,238,234,0.35)', marginBottom: '12px' }}>CRM Workspace</p>
                  <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(42px,6vw,64px)', color: '#F0EEEA', letterSpacing: '0.03em', lineHeight: 0.9, margin: 0 }}>
                    FORGOT<br />PASSWORD?
                  </h1>
                  <p style={{ fontSize: '13px', color: 'rgba(240,238,234,0.45)', marginTop: '16px', lineHeight: 1.6 }}>
                    Enter your email and we'll send you a secure reset link.
                  </p>
                </div>

                <div style={{ height: '1px', background: 'rgba(240,238,234,0.1)', marginBottom: '32px' }} />

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '12px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '4px', fontSize: '12px', color: '#fca5a5' }}>
                          {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label htmlFor="reset-email"
                      style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: focused ? 'rgba(240,238,234,0.7)' : 'rgba(240,238,234,0.4)', marginBottom: '8px', transition: 'color 0.2s' }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '15px', height: '15px', color: focused ? 'rgba(240,238,234,0.7)' : 'rgba(240,238,234,0.3)', transition: 'color 0.2s' }} />
                      <input
                        id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="hello@autonexai.org" required autoComplete="email"
                        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                        style={{
                          width: '100%', paddingLeft: '44px', paddingRight: '16px',
                          height: '52px', fontFamily: "'Inter', sans-serif", fontSize: '14px',
                          background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(240,238,234,0.04)',
                          border: focused ? '2px solid rgba(240,238,234,0.4)' : '2px solid rgba(240,238,234,0.1)',
                          borderRadius: '4px', color: '#F0EEEA', outline: 'none', transition: 'all 0.2s',
                        }}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || !email}
                    whileHover={{ scale: loading || !email ? 1 : 1.01 }}
                    whileTap={{ scale: loading || !email ? 1 : 0.98 }}
                    style={{
                      height: '52px', width: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 700,
                      letterSpacing: '0.14em', textTransform: 'uppercase',
                      background: loading || !email ? 'rgba(240,238,234,0.12)' : '#F0EEEA',
                      color: loading || !email ? 'rgba(240,238,234,0.35)' : '#1A1A1A',
                      border: 'none', borderRadius: '4px',
                      cursor: loading || !email ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {loading
                      ? <><Loader2 style={{ width: '15px', height: '15px', animation: 'spin 1s linear infinite' }} /><span>Sending…</span></>
                      : <span>Send Reset Link →</span>
                    }
                  </motion.button>
                </form>

                <p style={{ marginTop: '40px', fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(240,238,234,0.2)', textAlign: 'center' }}>
                  SECURE · INVITE-ONLY · AUTONEX AI TECHNOLOGIES
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
