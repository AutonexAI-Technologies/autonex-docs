'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useUserRole, clearRoleCache } from '@/lib/useUserRole'
import { canAccess, ROLE_COLOR } from '@/lib/roleAccess'
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  RefreshCw,
  BarChart3,
  Activity,
  Bell,
  Settings,
  UserCog,
  LogOut,
  ChevronRight,
  Zap,
  Menu,
  X,
  Shield,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',      label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/clients',        label: 'Clients',       icon: Users },
  { href: '/documents',      label: 'Documents',     icon: FileText },
  { href: '/invoices',       label: 'Invoices',      icon: Receipt },
  { href: '/retainers',      label: 'Retainers',     icon: RefreshCw },
  { href: '/reports',        label: 'Reports',       icon: BarChart3 },
  { href: '/activity',       label: 'Activity Log',  icon: Activity },
  { href: '/team',           label: 'Team',          icon: UserCog },
  { href: '/notifications',  label: 'Notifications', icon: Bell },
  { href: '/settings',       label: 'Settings',      icon: Settings },
]

function NavItem({ item, active, onClick }: { item: typeof navItems[0]; active: boolean; onClick?: () => void }) {
  return (
    <Link href={item.href} onClick={onClick}>
      <motion.div
        whileHover={{ x: 2 }}
        className={`sidebar-item ${active ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
      >
        <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
        <span className="flex-1">{item.label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 text-blue-400/60" />}
      </motion.div>
    </Link>
  )
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role_name, department_name, loading } = useUserRole()

  async function handleSignOut() {
    clearRoleCache()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter nav items based on role permissions
  const visibleNavItems = navItems.filter(item =>
    !role_name || canAccess(role_name, item.href)
  )

  const roleColor = role_name ? (ROLE_COLOR[role_name] ?? 'text-slate-400') : 'text-slate-500'

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl anx-gradient flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none font-[Plus_Jakarta_Sans]">Autonex AI</p>
            <p className="text-slate-500 text-[10px] mt-0.5 leading-none">Operations Platform</p>
          </div>
        </Link>
      </div>

      {/* Role badge */}
      {!loading && role_name && (
        <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-xl bg-white/3 border border-white/6 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <div className="min-w-0">
            <p className={`text-xs font-semibold truncate ${roleColor}`}>{role_name}</p>
            {department_name && (
              <p className="text-[10px] text-slate-600 truncate">{department_name}</p>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {visibleNavItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return <NavItem key={item.href} item={item} active={active} onClick={() => setMobileOpen(false)} />
        })}
      </nav>

      {/* Bottom — sign out */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <button
          onClick={handleSignOut}
          className="sidebar-item sidebar-item-inactive w-full text-left text-red-400/70 hover:text-red-400 hover:bg-red-500/5"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[#0d1a35] border-r border-white/5 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-[#0d1a35] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-[#0d1a35] z-50 border-r border-white/5"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
