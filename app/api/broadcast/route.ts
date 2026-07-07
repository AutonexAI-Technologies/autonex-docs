export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/broadcast
 * Sends a broadcast message to all threads (team, clients, or everyone).
 * Body: { message, target: 'all' | 'team' | 'clients' }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { message, target = 'all' } = await request.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

    // Get sender name
    const { data: member } = await admin
      .from('team_members')
      .select('name')
      .eq('email', user.email ?? '')
      .single()
    const senderName = (member as any)?.name || user.email?.split('@')[0] || 'Admin'

    // Get all threads or filter by target
    let query = admin.from('chat_threads').select('id, client_id, department')
    if (target === 'team') {
      query = query.eq('department', 'general')
    }
    const { data: threads } = await query

    if (!threads?.length) {
      return NextResponse.json({ message: 'No threads found to broadcast to' }, { status: 200 })
    }

    // Insert broadcast message into each thread
    const messages = threads.map(t => ({
      thread_id: t.id,
      sender_id: user.id,
      sender_name: senderName,
      sender_type: 'team',
      content: `📢 [BROADCAST] ${message.trim()}`,
    }))

    const { error: insertErr } = await admin.from('chat_messages').insert(messages)
    if (insertErr) {
      console.error('[broadcast]', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Update last_message on each thread
    for (const t of threads) {
      await admin.from('chat_threads').update({
        last_message: `📢 ${message.trim().slice(0, 100)}`,
        last_message_at: new Date().toISOString(),
      }).eq('id', t.id)
    }

    // Create notification
    await admin.from('notifications').insert({
      title: 'Broadcast Sent',
      message: `Broadcast sent to ${threads.length} thread(s): "${message.trim().slice(0, 60)}..."`,
      user_id: user.id,
    })

    return NextResponse.json({ 
      message: `Broadcast sent to ${threads.length} thread(s)`,
      count: threads.length 
    })
  } catch (err: any) {
    console.error('[POST /api/broadcast]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
