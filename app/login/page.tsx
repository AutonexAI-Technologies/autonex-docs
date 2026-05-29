'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center relative overflow-hidden">
      {/* Soft ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-violet-200/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-cyan-200/15 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-4"
          >
            <img src="/logo.png" alt="Autonex AI" className="h-10 object-contain" />
          </motion.div>
          <p className="text-slate-500 text-sm mt-2">Internal Operations Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Welcome Back</h2>
          <p className="text-slate-500 text-sm mb-6">Invite-only access. If you&apos;re not invited, you can&apos;t log in.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@autonexai.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 h-11 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold transition-all hover:opacity-90 shadow-lg shadow-blue-500/20 rounded-xl mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                'Sign In →'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between">
            <a href="/forgot-password" className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
              Forgot your password?
            </a>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck className="w-3 h-3" />
              <span>Secure &amp; encrypted</span>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          🔒 Secure · Invite-only · Autonex AI Technologies
        </p>
      </motion.div>
    </div>
  )
}