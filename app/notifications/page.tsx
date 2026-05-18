'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, Users, Receipt, RefreshCw, FileText, AlertCircle, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

const typeStyle: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/15', icon: 'text-emerald-400' },
  warning: { bg: 'bg-amber-500/10',   border: 'border-amber-500/15',   icon: 'text-amber-400' },
  error:   { bg: 'bg-red-500/10',     border: 'border-red-500/15',     icon: 'text-red-400' },
  info:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/15',    icon: 'text-blue-400' },
}

const typeIcon: Record<string, any> = {
  success: Users,
  warning: RefreshCw,
  error:   AlertCircle,
  info:    FileText,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadNotifications() }, [])

  async function markAllRead() {
    setMarking(true)
    await fetch('/api/notifications', { method: 'PATCH', body: JSON.stringify({}), headers: { 'Content-Type': 'application/json' } })
    await loadNotifications()
    setMarking(false)
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div className="px-6 py-8 max-w-[900px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="page-header">Notifications</h1>
          <p className="text-slate-400 text-sm mt-1">
            {loading ? 'Loading...' : unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <Button
            onClick={markAllRead}
            disabled={marking}
            variant="ghost"
            className="text-slate-400 hover:text-white gap-2 h-9 px-4 rounded-xl border border-white/10"
          >
            {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark all read
          </Button>
        )}
      </motion.div>

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Bell className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-white font-medium">No notifications yet</p>
          <p className="text-slate-500 text-sm mt-1">Activity and alerts will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif, i) => {
            const styles = typeStyle[notif.type] ?? typeStyle.info
            const Icon = typeIcon[notif.type] ?? Info
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border ${styles.border} ${styles.bg} p-4 flex items-start gap-4 ${!notif.read ? 'ring-1 ring-white/5' : 'opacity-60'}`}
              >
                <div className={`w-9 h-9 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${styles.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{notif.title}</p>
                    {!notif.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">{notif.message}</p>
                </div>
                <span className="text-slate-600 text-xs shrink-0">
                  {format(new Date(notif.created_at), 'dd MMM, HH:mm')}
                </span>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Preferences section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 rounded-2xl border border-white/5 bg-[#0d1a35]/60 p-6"
      >
        <h2 className="text-white font-semibold text-sm mb-4">Notification Preferences</h2>
        <div className="space-y-3">
          {[
            { label: 'New client added',       desc: 'Notify when a team member adds a client' },
            { label: 'Retainer invoice due',   desc: 'Remind 3 days before due date' },
            { label: 'Invoice overdue',        desc: 'Alert when payment is past due date' },
            { label: 'Document sent',          desc: 'Confirm when a PDF is emailed' },
            { label: 'New team member joined', desc: 'Alert when an invite is accepted' },
          ].map((pref) => (
            <div key={pref.label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm">{pref.label}</p>
                <p className="text-slate-500 text-xs">{pref.desc}</p>
              </div>
              <div className="flex gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-blue-500 w-3.5 h-3.5 rounded" />
                  In-app
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-blue-500 w-3.5 h-3.5 rounded" />
                  Email
                </label>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

