'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Paperclip, LayoutGrid, Palette,
  Wrench, Share2, CreditCard, Building2, Circle,
  Check, CheckCheck, Clock
} from 'lucide-react'

interface Message {
  id: string
  sender_id: string
  content: string
  sender_name: string
  sender_role: string | null
  sender_type: 'team' | 'client'
  status: 'sent' | 'delivered' | 'read'
  created_at: string
}
interface Thread {
  id: string
  client_id: string
  department: string
  name: string
  clients: { name: string; company: string }
}

const DEPT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  general: LayoutGrid, design: Palette, tech: Wrench, social: Share2, billing: CreditCard,
}
const DEPT_COLOR: Record<string, string> = {
  general: 'text-blue-400', design: 'text-violet-400',
  tech: 'text-teal-400', social: 'text-pink-400', billing: 'text-amber-400',
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-blue-400" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-slate-500" />
  return <Check className="w-3 h-3 text-slate-600" />
}

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [thread, setThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('Team')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load thread + user
  const init = useCallback(async () => {
    const [{ data: { user } }, { data: th }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('chat_threads').select('*, clients(name,company)').eq('id', threadId).single(),
    ])
    setThread(th as any)
    if (user) {
      setUserId(user.id)
      const { data: m } = await supabase
        .from('team_members')
        .select('name, roles(name)')
        .eq('email', user.email ?? '')
        .single()
      if (m) {
        setUserName((m as any).name ?? user.email ?? 'Team')
        setUserRole((m as any).roles?.name ?? null)
      }
    }
  }, [supabase, threadId])

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
    setLoading(false)
  }, [supabase, threadId])

  useEffect(() => {
    init()
    loadMessages()
  }, [init, loadMessages])

  // Realtime subscription
  const pendingKeys = useRef<Set<string>>(new Set())

  useEffect(() => {
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload: any) => {
        const incoming = payload.new as Message
        const key = `${incoming.sender_id}::${incoming.content}`
        if (pendingKeys.current.has(key)) {
          // Replace optimistic copy with real DB record
          pendingKeys.current.delete(key)
          setMessages(prev => prev.map(m =>
            m.id.startsWith('opt-') && m.content === incoming.content ? incoming : m
          ))
        } else {
          setMessages(prev => [...prev, incoming])
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, threadId])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const content = input.trim()
    if (!content || !thread || !userId || sending) return
    setInput('')
    setSending(true)
    const key = `${userId}::${content}`
    pendingKeys.current.add(key)
    const tempId = `opt-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      sender_id: userId,
      content,
      sender_name: userName,
      sender_role: userRole,
      sender_type: 'team',
      status: 'sent',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    await supabase.from('chat_messages').insert({
      thread_id: threadId,
      client_id: thread.client_id,
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      sender_type: 'team',
      content,
      status: 'sent',
    })
    await supabase.from('chat_threads').update({
      last_message: content,
      last_message_at: new Date().toISOString(),
    }).eq('id', threadId)
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const Icon = thread ? (DEPT_ICON[thread.department] ?? LayoutGrid) : LayoutGrid
  const color = thread ? (DEPT_COLOR[thread.department] ?? 'text-blue-400') : 'text-blue-400'

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {thread?.clients?.name ?? '…'}
            </p>
            <span className="text-slate-600">·</span>
            <span className={`text-xs font-medium ${color}`}>{thread?.name ?? '…'}</span>
          </div>
          {thread?.clients?.company && (
            <p className="text-[10px] text-slate-600 flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5" />{thread.clients.company}
            </p>
          )}
        </div>
        {thread && (
          <Link
            href={`/clients/${thread.client_id}`}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors px-2.5 py-1 rounded-lg border border-blue-500/20 hover:border-blue-500/40"
          >
            View Client
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-slate-500 text-sm">No messages yet</p>
            <p className="text-slate-600 text-xs">Start the conversation below</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-50" />
                <span className="text-[10px] text-slate-600 font-medium">{group.date}</span>
                <div className="flex-1 h-px bg-slate-50" />
              </div>
              <div className="space-y-2">
                {group.messages.map((msg, i) => {
                  const isTeam = msg.sender_type === 'team'
                  const showSender = i === 0 || group.messages[i - 1]?.sender_name !== msg.sender_name
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isTeam ? 'items-end' : 'items-start'}`}
                    >
                      {showSender && (
                        <div className={`flex items-center gap-1.5 mb-1 ${isTeam ? 'flex-row-reverse' : ''}`}>
                          <span className={`text-[11px] font-medium ${isTeam ? 'text-slate-400' : 'text-slate-600'}`}>{msg.sender_name}</span>
                          {msg.sender_role && (
                            <span className="text-[10px] text-slate-400">· {msg.sender_role}</span>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                        isTeam
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isTeam ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isTeam ? 'text-blue-200' : 'text-slate-600'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                          {isTeam && <StatusIcon status={msg.status} />}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-white backdrop-blur-sm">
        <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none max-h-32 scrollbar-thin py-1.5"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-700 mt-1.5 text-center">
          Sending as <span className="text-slate-500">{userName}</span>
          {userRole && <> · <span className="text-slate-500">{userRole}</span></>}
        </p>
      </div>
    </div>
  )
}
