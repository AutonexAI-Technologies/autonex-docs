import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/messages/threads/[id]/messages
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('chat_messages')
      .select('*')
      .eq('thread_id', params.id)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/messages/threads/[id]/messages
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const body = await req.json()
    const { client_id, sender_id, sender_name, sender_role, sender_type, content } = body

    if (!content || !client_id || !sender_id) {
      return NextResponse.json({ error: 'content, client_id, sender_id required' }, { status: 400 })
    }

    const { data, error } = await admin.from('chat_messages').insert({
      thread_id: params.id,
      client_id,
      sender_id,
      sender_name: sender_name || 'Unknown',
      sender_role: sender_role || null,
      sender_type: sender_type || 'team',
      content,
      status: 'sent',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update thread's last_message
    await admin.from('chat_threads').update({
      last_message: content.substring(0, 100),
      last_message_at: new Date().toISOString(),
    }).eq('id', params.id)

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
