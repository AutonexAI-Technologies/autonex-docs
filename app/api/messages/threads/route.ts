import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/messages/threads?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const clientId = new URL(req.url).searchParams.get('client_id')
    let q = admin.from('chat_threads').select('*, clients(name,company)').order('last_message_at', { ascending: false, nullsFirst: false })
    if (clientId) q = q.eq('client_id', clientId) as any
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
