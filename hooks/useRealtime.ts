'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

/**
 * useRealtimeMessages — subscribes to chat_messages for a thread
 */
export function useRealtimeMessages(threadId: string | null) {
  const supabase = createClient()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!threadId) return
    setLoading(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoading(false)
  }, [threadId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!threadId) return
    const channel = supabase
      .channel(`messages:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload: any) => {
        setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [threadId])

  return { messages, loading, reload: load }
}

/**
 * useRealtimeMilestones — subscribes to project_milestones for a client
 */
export function useRealtimeMilestones(clientId: string | null) {
  const supabase = createClient()
  const [milestones, setMilestones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const { data } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true })
    setMilestones(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!clientId) return
    const channel = supabase
      .channel(`milestones:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_milestones',
        filter: `client_id=eq.${clientId}`,
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, load])

  return { milestones, loading, reload: load }
}

/**
 * useRealtimeInvoices — subscribes to invoices table
 */
export function useRealtimeInvoices(clientId?: string) {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('invoices').select('*').order('created_at', { ascending: false })
    if (clientId) q = q.eq('client_id', clientId) as any
    const { data } = await q
    setInvoices(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const filter = clientId ? `client_id=eq.${clientId}` : undefined
    const channel = supabase
      .channel(`invoices:${clientId || 'all'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices',
        ...(filter ? { filter } : {}),
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, load])

  return { invoices, loading, reload: load }
}

/**
 * useRealtimeFiles — subscribes to files for a client
 */
export function useRealtimeFiles(clientId: string | null) {
  const supabase = createClient()
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const { data } = await supabase
      .from('files')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    setFiles(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!clientId) return
    const channel = supabase
      .channel(`files:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'files',
        filter: `client_id=eq.${clientId}`,
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, load])

  return { files, loading, reload: load }
}

/**
 * useRealtimeTickets — subscribes to support_tickets for a client
 */
export function useRealtimeTickets(clientId?: string) {
  const supabase = createClient()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('support_tickets').select('*, ticket_responses(*)').order('created_at', { ascending: false })
    if (clientId) q = q.eq('client_id', clientId) as any
    const { data } = await q
    setTickets(data ?? [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const filter = clientId ? `client_id=eq.${clientId}` : undefined
    const channel = supabase
      .channel(`tickets:${clientId || 'all'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
        ...(filter ? { filter } : {}),
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [clientId, load])

  return { tickets, loading, reload: load }
}

/**
 * useRealtimeNotifications — subscribes to notifications table for a user
 */
export function useRealtimeNotifications(userId: string | null) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    const notifs = data ?? []
    setNotifications(notifs)
    setUnreadCount(notifs.filter((n: any) => !n.read).length)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        setNotifications((prev) => [payload.new, ...prev].slice(0, 50))
        setUnreadCount((c) => c + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, loading, reload: load, markRead, markAllRead }
}
