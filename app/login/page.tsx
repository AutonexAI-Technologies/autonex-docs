'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Lock, Mail } from 'lucide-react'
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

    // Sync team member status: invited → active (fire and forget, no await needed for UX)
    fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})

    router.push('/dashboard')
    router.refresh()
  }


  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      </div>

      {/* Login Card */}
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
            <img
              src="/logo.png"
              alt="Autonex AI"
              className="h-10 object-contain"
            />
          </motion.div>
          <p className="text-slate-400 text-sm mt-2">Internal Operations Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome Back</h2>
          <p className="text-slate-400 text-sm mb-6">Invite-only access. If you're not invited, you can't log in.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@autonexai.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-[#0d1a35] border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-[#0d1a35] border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 h-11 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 anx-gradient text-white font-semibold transition-all hover:opacity-90 shadow-lg shadow-blue-500/20 rounded-xl mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                'Sign In →'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <a href="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              Forgot your password?
            </a>
          </div>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          🔒 Secure · Invite-only · Autonex AI Technologies
        </p>
      </motion.div>
    </div>
  )
}