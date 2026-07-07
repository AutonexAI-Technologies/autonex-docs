export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/messages/threads?client_id=xx&type=client|internal
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const { searchParams } = new URL(req.url)
    const clientId   = searchParams.get('client_id')
    const threadType = searchParams.get('type') // 'client' | 'internal'

    let q = admin
      .from('chat_threads')
      .select('id, client_id, department, name, last_message, last_message_at, type, thread_type, team_id, team_name, unread_count, created_at, clients(name,company)')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (clientId)   q = (q as any).eq('client_id', clientId)
    if (threadType) q = (q as any).eq('thread_type', threadType)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/messages/threads — create or seed threads for a client
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const { client_id } = await req.json()
    if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })
    const { error } = await admin.rpc('create_default_chat_threads', { p_client_id: client_id })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data } = await admin.from('chat_threads').select('*').eq('client_id', client_id)
    return NextResponse.json(data ?? [], { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
