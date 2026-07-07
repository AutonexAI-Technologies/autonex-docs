'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Paperclip, LayoutGrid, Palette,
  Wrench, Share2, CreditCard, Building2,
  Check, CheckCheck, Lock, X, FileIcon, ImageIcon,
  Smile,
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
  attachment_url?: string
  attachment_name?: string
  attachment_type?: string
}
interface Thread {
  id: string
  client_id: string
  department: string
  name: string
  thread_type: string
  team_name: string | null
  clients: { name: string; company: string }
}

const DEPT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  general: LayoutGrid, design: Palette, tech: Wrench, social: Share2, billing: CreditCard,
}
const DEPT_COLOR: Record<string, string> = {
  general: 'text-blue-400', design: 'text-violet-400',
  tech: 'text-cyan-400', social: 'text-pink-400', billing: 'text-amber-400',
}
const REACTIONS = ['👍', '❤️', '😄', '🔥', '✅', '👀']

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
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-blue-300" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-blue-200/60" />
  return <Check className="w-3 h-3 text-blue-200/60" />
}
function isImage(mime?: string) { return mime?.startsWith('image/') }

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
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [reactionTarget, setReactionTarget] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, { emoji: string; count: number; reacted: boolean }[]>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingKeys = useRef<Set<string>>(new Set())
  const presenceChannel = useRef<any>(null)

  // Load thread + user
  const init = useCallback(async () => {
    const [{ data: { user } }, { data: th }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('chat_threads').select('*, clients(name,company)').eq('id', threadId).single(),
    ])
    setThread(th as any)
    await supabase.from('chat_threads').update({ unread_count: 0 }).eq('id', threadId)
    if (user) {
      setUserId(user.id)
      const { data: m } = await supabase
        .from('team_members').select('name, roles(name)')
        .eq('email', user.email ?? '').single()
      if (m) {
        setUserName((m as any).name ?? user.email ?? 'Team')
        setUserRole((m as any).roles?.name ?? null)
      }
    }
  }, [supabase, threadId])

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages').select('*')
      .eq('thread_id', threadId).order('created_at', { ascending: true })
    setMessages((data as Message[]) ?? [])
    setLoading(false)
  }, [supabase, threadId])

  // Load reactions
  const loadReactions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('message_reactions').select('*')
        .in('message_id', (await supabase.from('chat_messages').select('id').eq('thread_id', threadId)).data?.map((m: any) => m.id) ?? [])
      if (!data) return
      const map: Record<string, Record<string, { count: number; reacted: boolean }>> = {}
      data.forEach((r: any) => {
        if (!map[r.message_id]) map[r.message_id] = {}
        if (!map[r.message_id][r.emoji]) map[r.message_id][r.emoji] = { count: 0, reacted: false }
        map[r.message_id][r.emoji].count++
        if (r.user_id === userId) map[r.message_id][r.emoji].reacted = true
      })
      const formatted: Record<string, { emoji: string; count: number; reacted: boolean }[]> = {}
      Object.entries(map).forEach(([msgId, emojiMap]) => {
        formatted[msgId] = Object.entries(emojiMap).map(([emoji, val]) => ({ emoji, ...val }))
      })
      setReactions(formatted)
    } catch {}
  }, [supabase, threadId, userId])

  useEffect(() => { init(); loadMessages() }, [init, loadMessages])
  useEffect(() => { if (userId) loadReactions() }, [userId, loadReactions])

  // Real-time messages
  useEffect(() => {
    const channel = supabase.channel(`thread-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      }, (payload: any) => {
        const incoming = payload.new as Message
        const key = `${incoming.sender_id}::${incoming.content}`
        if (pendingKeys.current.has(key)) {
          pendingKeys.current.delete(key)
          setMessages(prev => prev.map(m =>
            m.id.startsWith('opt-') && m.content === incoming.content ? incoming : m
          ))
        } else {
          setMessages(prev => [...prev, incoming])
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, threadId])

  // Typing indicator via Presence
  useEffect(() => {
    if (!userName || !userId) return
    const ch = supabase.channel(`presence-thread-${threadId}`, { config: { presence: { key: userId } } })
    presenceChannel.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, any[]>
      const typers = Object.values(state)
        .flat()
        .filter((p: any) => p.isTyping && p.name !== userName)
        .map((p: any) => p.name as string)
      setTypingUsers(typers)
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, threadId, userName, userId])

  const setTyping = useCallback((typing: boolean) => {
    presenceChannel.current?.track({ name: userName, isTyping: typing })
  }, [userName])

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (content?: string, attachmentUrl?: string, attachmentName?: string, attachmentType?: string) => {
    const text = (content ?? input).trim()
    if (!text && !attachmentUrl) return
    if (!thread || !userId || sending) return
    setInput('')
    setSending(true)
    setTyping(false)
    const key = `${userId}::${text}`
    pendingKeys.current.add(key)
    const tempId = `opt-${Date.now()}`
    const optimistic: Message = {
      id: tempId, sender_id: userId, content: text,
      sender_name: userName, sender_role: userRole, sender_type: 'team',
      status: 'sent', created_at: new Date().toISOString(),
      attachment_url: attachmentUrl, attachment_name: attachmentName, attachment_type: attachmentType,
    }
    setMessages(prev => [...prev, optimistic])
    await supabase.from('chat_messages').insert({
      thread_id: threadId, client_id: thread.client_id, sender_id: userId,
      sender_name: userName, sender_role: userRole, sender_type: 'team',
      content: text, status: 'sent',
      attachment_url: attachmentUrl, attachment_name: attachmentName, attachment_type: attachmentType,
    })
    await supabase.from('chat_threads').update({
      last_message: attachmentUrl ? `📎 ${attachmentName ?? 'File'}` : text,
      last_message_at: new Date().toISOString(),
      unread_count: supabase.rpc ? undefined : undefined, // portal unread handled separately
    }).eq('id', threadId)
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId || !thread) return
    setUploadingFile(true)
    try {
      const safeExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ?? 'bin'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `messages/${threadId}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage
        .from('files')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (upErr) {
        console.error('[file upload error]', upErr)
        // Try with upsert=true as fallback
        const { error: upErr2 } = await supabase.storage
          .from('files')
          .upload(path + '-' + Date.now(), file, { contentType: file.type, upsert: true })
        if (upErr2) throw upErr2
        const { data: { publicUrl: publicUrl2 } } = supabase.storage.from('files').getPublicUrl(path + '-' + Date.now())
        await send('', publicUrl2, file.name, file.type)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(path)
        await send('', publicUrl, file.name, file.type)
      }
    } catch (err: any) {
      console.error('[file upload failed]', err)
      alert(`File upload failed: ${err?.message ?? 'Unknown error'}. Please check your Supabase storage bucket RLS policy allows uploads.`)
    }
    setUploadingFile(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return
    const existing = reactions[messageId]?.find(r => r.emoji === emoji && r.reacted)
    if (existing) {
      await supabase.from('message_reactions')
        .delete().eq('message_id', messageId).eq('user_id', userId).eq('emoji', emoji)
    } else {
      await supabase.from('message_reactions')
        .insert({ message_id: messageId, user_id: userId, user_name: userName, emoji })
    }
    loadReactions()
    setReactionTarget(null)
  }

  const Icon = thread ? (DEPT_ICON[thread.department] ?? LayoutGrid) : LayoutGrid
  const color = thread ? (DEPT_COLOR[thread.department] ?? 'text-blue-400') : 'text-blue-400'

  const grouped: { date: string; messages: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  })

  return (
    <div className="flex flex-col h-full" onClick={() => setReactionTarget(null)}>
      {/* Internal banner */}
      {thread?.thread_type === 'internal' && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold" style={{ background: 'linear-gradient(90deg,#7c3aed15,#6d28d915)', borderBottom: '1px solid #7c3aed25', color: '#7c3aed' }}>
          <Lock className="w-3 h-3" />
          Internal Thread — Team Only · Clients cannot see this conversation
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-3 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${thread?.thread_type === 'internal' ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200'}`}>
          {thread?.thread_type === 'internal' ? <Lock className="w-4 h-4 text-violet-500" /> : <Icon className={`w-4 h-4 ${color}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">{thread?.clients?.name ?? '…'}</p>
            <span className="text-slate-600">·</span>
            <span className={`text-xs font-medium ${thread?.thread_type === 'internal' ? 'text-violet-600' : color}`}>{thread?.name ?? '…'}</span>
          </div>
          {thread?.clients?.company && (
            <p className="text-[10px] text-slate-600 flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5" />{thread.clients.company}
            </p>
          )}
        </div>
        {thread && (
          <Link href={`/clients/${thread.client_id}`} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors px-2.5 py-1 rounded-lg border border-blue-500/20 hover:border-blue-500/40">
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
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[10px] text-slate-500 font-medium">{group.date}</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="space-y-2">
                {group.messages.map((msg, i) => {
                  const isTeam = msg.sender_type === 'team'
                  const showSender = i === 0 || group.messages[i - 1]?.sender_name !== msg.sender_name
                  const msgReactions = reactions[msg.id] ?? []
                  const showReactionPicker = reactionTarget === msg.id

                  return (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${isTeam ? 'items-end' : 'items-start'}`}>
                      {showSender && (
                        <div className={`flex items-center gap-1.5 mb-1 ${isTeam ? 'flex-row-reverse' : ''}`}>
                          <span className={`text-[11px] font-medium ${isTeam ? 'text-slate-400' : 'text-slate-600'}`}>{msg.sender_name}</span>
                          {msg.sender_role && <span className="text-[10px] text-slate-400">· {msg.sender_role}</span>}
                        </div>
                      )}

                      <div className="relative group">
                        {/* Reaction button on hover */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setReactionTarget(showReactionPicker ? null : msg.id) }}
                          className={`absolute top-1 ${isTeam ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 shadow-sm z-10`}
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>

                        <div className={`max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-sm ${isTeam
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                          }`}>
                          {/* Attachment rendering */}
                          {msg.attachment_url && isImage(msg.attachment_type) && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                              <img src={msg.attachment_url} alt={msg.attachment_name} className="max-w-[200px] rounded-xl border border-white/20" />
                            </a>
                          )}
                          {msg.attachment_url && !isImage(msg.attachment_type) && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-xl ${isTeam ? 'bg-blue-700/60' : 'bg-slate-50 border border-slate-200'}`}>
                              <FileIcon className="w-4 h-4 shrink-0" />
                              <span className="text-xs truncate max-w-[150px]">{msg.attachment_name}</span>
                            </a>
                          )}
                          {msg.content && msg.content !== `📎 ${msg.attachment_name}` && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isTeam ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[10px] ${isTeam ? 'text-blue-200' : 'text-slate-600'}`}>{formatTime(msg.created_at)}</span>
                            {isTeam && <StatusIcon status={msg.status} />}
                          </div>
                        </div>

                        {/* Reaction picker */}
                        <AnimatePresence>
                          {showReactionPicker && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.85, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.85 }}
                              onClick={e => e.stopPropagation()}
                              className={`absolute ${isTeam ? 'right-0' : 'left-0'} bottom-full mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl px-2 py-1.5 flex items-center gap-1 z-20`}
                            >
                              {REACTIONS.map(emoji => (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                  className="w-8 h-8 rounded-xl flex items-center justify-center text-lg hover:bg-slate-100 transition-colors">
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Reaction chips */}
                      {msgReactions.length > 0 && (
                        <div className={`flex items-center gap-1 mt-1 flex-wrap ${isTeam ? 'justify-end' : 'justify-start'}`}>
                          {msgReactions.map(r => (
                            <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${r.reacted ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                              {r.emoji} <span>{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-1">
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-slate-500">{typingUsers.join(', ')} typing…</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-white">
        {/* Upload progress */}
        {uploadingFile && (
          <div className="mb-2 flex items-center gap-2 text-xs text-blue-500 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
            Uploading file…
          </div>
        )}
        <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2">
          {/* File button */}
          <button onClick={() => fileRef.current?.click()}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors shrink-0 mb-0.5"
            title="Attach file">
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              setTyping(e.target.value.length > 0)
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={handleKey}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none max-h-32 scrollbar-thin py-1.5"
            style={{ minHeight: '36px' }}
          />
          <button onClick={() => send()}
            disabled={(!input.trim() && !uploadingFile) || sending}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
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
