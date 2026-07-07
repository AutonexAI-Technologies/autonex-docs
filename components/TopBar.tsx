'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle2, Zap } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

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
  '/messages':     'Messages',
  '/pipeline':     'Pipeline',
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
  if (type === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
  if (type === 'error')   return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
  if (type === 'message') return <Zap className="w-3.5 h-3.5 text-violet-400" />
  return <Info className="w-3.5 h-3.5 text-slate-400" />
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function TopBar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Autonex AI'
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userInitial, setUserInitial] = useState('A')
  const [userName, setUserName] = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const loadNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      if (Array.isArray(data)) {
        setNotifications(data.slice(0, 12))
        setUnreadCount(data.filter((n: any) => !n.read).length)
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifs()
    const supabase2 = createClient()
    supabase2.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.invited_name || user.email?.split('@')[0] || 'A'
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
      }
    })
  }, [pathname, loadNotifs])

  // Real-time notification subscription
  useEffect(() => {
    const channel = supabase
      .channel('topbar-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        loadNotifs()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => {
        loadNotifs()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadNotifs])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30 flex items-center px-6 gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-slate-900 font-semibold text-sm truncate">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen(o => !o)}
            className="relative w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center px-1"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/80 z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">{unreadCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setBellOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell className="w-7 h-7 text-slate-200" />
                      <p className="text-slate-400 text-xs">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/80 cursor-default ${!n.read ? 'bg-blue-50/40' : ''}`}
                      >
                        <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          !n.read ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                          <NotifIcon type={n.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                        )}
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60">
                  <Link href="/notifications" onClick={() => setBellOpen(false)}
                    className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors font-medium">
                    View all notifications →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
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
