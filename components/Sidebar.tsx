'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { useUserRole, clearRoleCache } from '@/lib/useUserRole'
import { canAccess, ROLE_COLOR } from '@/lib/roleAccess'
import {
  LayoutDashboard, Users, FileText, Receipt, RefreshCw,
  BarChart3, Activity, Bell, Settings, UserCog, LogOut,
  ChevronRight, Menu, X, Shield, Briefcase, MessageSquare, Megaphone,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    items: [
      { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
      { href: '/clients',       label: 'Clients',        icon: Users },
      { href: '/pipeline',      label: 'Pipeline',       icon: Briefcase },
      { href: '/messages',      label: 'Messages',       icon: MessageSquare },
      { href: '/announcements', label: 'Announcements',  icon: Megaphone },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/documents', label: 'Documents', icon: FileText },
      { href: '/invoices',  label: 'Invoices',  icon: Receipt },
      { href: '/retainers', label: 'Retainers', icon: RefreshCw },
      { href: '/reports',   label: 'Reports',   icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/activity',      label: 'Activity Log',  icon: Activity },
      { href: '/team',          label: 'Team',           icon: UserCog },
      { href: '/notifications', label: 'Notifications',  icon: Bell },
      { href: '/settings',      label: 'Settings',       icon: Settings },
    ],
  },
]

const allNavItems = NAV_SECTIONS.flatMap(s => s.items)

function NavItem({
  item, active, onClick, badge,
}: {
  item: (typeof allNavItems)[0]; active: boolean; onClick?: () => void; badge?: number
}) {
  return (
    <Link href={item.href} onClick={onClick}>
      <div className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}>
        <item.icon
          className="w-[15px] h-[15px] shrink-0"
          style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)' }}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {badge && badge > 0 ? (
          <span className="min-w-[18px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : active ? (
          <ChevronRight className="w-3 h-3 opacity-40" />
        ) : null}
      </div>
    </Link>
  )
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const { role_name, department_name, loading, isAdmin } = useUserRole()
  const supabase = createClient()

  const loadUnread = useCallback(async () => {
    try {
      const { data } = await supabase.from('chat_threads').select('unread_count')
      const total = (data ?? []).reduce((s: number, t: any) => s + (t.unread_count ?? 0), 0)
      setUnreadMessages(total)
    } catch {}
  }, [supabase])

  useEffect(() => {
    loadUnread()
    const channel = supabase
      .channel('sidebar-unread')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_threads' }, loadUnread)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, loadUnread])

  async function handleSignOut() {
    clearRoleCache()
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const hasFullAccess = isAdmin || role_name === 'Founder' || role_name === 'Managing Director'
  const allowedHrefs = hasFullAccess ? null : new Set(allNavItems.filter(i => !role_name || canAccess(role_name, i.href)).map(i => i.href))
  const roleColor = role_name ? (ROLE_COLOR[role_name] ?? 'text-slate-400') : ''

  const initials = (role_name ?? 'AN').slice(0, 2).toUpperCase()

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Logo ── */}
      <div
        className="px-4 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/logo.png" alt="Autonex AI" className="h-8 w-auto object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-white leading-tight tracking-[-0.01em]">Autonex AI</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--sidebar-label)' }}>Operations Platform</p>
          </div>
        </Link>
      </div>

      {/* ── Role badge ── */}
      {!loading && role_name && (
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
            style={{ background: 'var(--sidebar-surface)', border: '1px solid var(--sidebar-border)' }}
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#93C5FD' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate ${roleColor}`}>{role_name}</p>
              {department_name && (
                <p className="text-[10px] truncate" style={{ color: 'var(--sidebar-label)' }}>{department_name}</p>
              )}
            </div>
            <Shield className="w-3.5 h-3.5 ml-auto flex-shrink-0" style={{ color: 'var(--sidebar-label)' }} />
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-dark space-y-4">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(item =>
            !allowedHrefs || allowedHrefs.has(item.href)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={si}>
              {section.label && (
                <p
                  className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: 'var(--sidebar-label)' }}
                >
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  const badge = item.href === '/messages' ? unreadMessages : undefined
                  return (
                    <NavItem
                      key={item.href}
                      item={item}
                      active={active}
                      badge={badge}
                      onClick={() => setMobileOpen(false)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* ── Sign out ── */}
      <div className="px-3 pb-4 pt-2 flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <button
          onClick={handleSignOut}
          className="sidebar-item sidebar-item-inactive w-full text-left group"
          style={{ color: 'rgba(255,255,255,0.35)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FF6B6B')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30"
        style={{
          width: 'var(--sidebar-width)',
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3.5 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--sidebar-border)', color: 'var(--sidebar-text)' }}
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 flex flex-col"
              style={{
                width: '240px',
                background: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--sidebar-border)',
              }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: 'var(--sidebar-surface)', color: 'var(--sidebar-text)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
