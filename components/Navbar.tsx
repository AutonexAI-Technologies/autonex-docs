'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Zap, LogOut, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function Navbar() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast({ title: 'Logged out successfully' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-white/10 bg-[#0A0F1E]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
            <Zap className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <span className="font-bold text-white text-sm">Autonex AI</span>
            <p className="text-slate-500 text-xs leading-none">Doc Portal</p>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-white/5"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}