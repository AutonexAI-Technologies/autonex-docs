'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, X, CheckCheck, Info, AlertTriangle, CheckCircle2, Zap, Search } from 'lucide-react'
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
  '/announcements':'Announcements',
}

const NOTIF_ICON: Record<string, { icon: any; bg: string; color: string }> = {
  success: { icon: CheckCircle2, bg: 'rgba(48,209,88,0.1)',   color: '#30D158' },
  warning: { icon: AlertTriangle,bg: 'rgba(255,159,10,0.1)',  color: '#FF9F0A' },
  error:   { icon: AlertTriangle,bg: 'rgba(255,59,48,0.1)',   color: '#FF3B30' },
  message: { icon: Zap,          bg: 'rgba(0,113,227,0.1)',   color: '#0071E3' },
  info:    { icon: Info,         bg: 'rgba(0,113,227,0.08)',  color: '#0071E3' },
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

  // Derive page title — handle dynamic routes like /clients/[id]
  let title = pageTitles[pathname] ?? ''
  if (!title) {
    const segment = pathname.split('/')[1]
    title = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Autonex AI'
  }

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
    createClient().auth.getUser().then(({ data: { user } }: { data: { user: any } }) => {
      if (user) {
        const name = user.user_metadata?.full_name || user.user_metadata?.invited_name || user.email?.split('@')[0] || 'A'
        setUserName(name)
        setUserInitial(name.charAt(0).toUpperCase())
      }
    })
  }, [pathname, loadNotifs])

  useEffect(() => {
    const channel = supabase
      .channel('topbar-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, loadNotifs)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, loadNotifs)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadNotifs])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
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
    <header
      className="h-[52px] flex items-center px-5 gap-3 sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1
          className="text-[15px] font-semibold truncate"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5">

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            id="topbar-notifications-btn"
            onClick={() => setBellOpen(o => !o)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <Bell className="w-[17px] h-[17px]" />
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5"
                style={{ background: 'var(--error)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                transition={{ duration: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute right-0 top-10 w-80 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold"
                        style={{ background: 'var(--accent)' }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] flex items-center gap-1 transition-colors"
                        style={{ color: 'var(--accent)' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <CheckCheck className="w-3 h-3" /> Mark read
                      </button>
                    )}
                    <button
                      onClick={() => setBellOpen(false)}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-tertiary)'
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
                      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => {
                      const cfg = NOTIF_ICON[n.type] ?? NOTIF_ICON.info
                      const IconC = cfg.icon
                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 px-4 py-3"
                          style={{
                            borderBottom: i < notifications.length - 1 ? '1px solid var(--divider)' : 'none',
                            background: !n.read ? 'rgba(0,113,227,0.03)' : 'transparent',
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: cfg.bg }}
                          >
                            <IconC className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[12px] font-medium truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {n.title}
                            </p>
                            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                              {n.message}
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--accent)' }} />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-2.5"
                  style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
                >
                  <Link
                    href="/notifications"
                    onClick={() => setBellOpen(false)}
                    className="text-[11px] font-medium transition-opacity"
                    style={{ color: 'var(--accent)' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    View all notifications →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <div
          title={userName}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-[12px] cursor-default select-none flex-shrink-0"
          style={{ background: 'var(--accent)', letterSpacing: '0' }}
        >
          {userInitial}
        </div>
      </div>
    </header>
  )
}
