'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/clients':      'Clients',
  '/clients/new':  'New Client',
  '/documents':    'Documents',
  '/invoices':     'Invoices',
  '/retainers':    'Retainers',
  '/reports':      'Reports',
  '/activity':     'Activity Log',
  '/team':         'Team',
  '/notifications':'Notifications',
  '/settings':     'Settings',
}

export default function TopBar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Autonex AI'
  const [unreadCount, setUnreadCount] = useState(0)
  const [userInitial, setUserInitial] = useState('A')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Fetch unread notification count
    fetch('/api/notifications')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n: any) => !n.read).length)
        }
      })
      .catch(() => {})

    // Fetch current user info
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.invited_name || user.email?.split('@')[0] || 'A'
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
      }
    })
  }, [pathname])

  return (
    <header className="h-14 border-b border-white/5 bg-[#0a1628]/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-semibold text-sm truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell with real unread count */}
        <Link href="/notifications">
          <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </Link>

        {/* Real user avatar */}
        <div
          title={userName}
          className="w-8 h-8 rounded-xl anx-gradient flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20 cursor-default"
        >
          {userInitial}
        </div>
      </div>
    </header>
  )
}
