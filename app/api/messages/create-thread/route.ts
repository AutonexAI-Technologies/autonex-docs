export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/messages/create-thread
 * Creates a single named thread for a client
 * Body: { client_id, name, department, thread_type, team_name }
 */
export async function POST(req: NextRequest) {
  try {
    const server = await createServerSupabaseClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { client_id, name, department = 'general', thread_type = 'client', team_name } = body
    if (!client_id || !name) {
      return NextResponse.json({ error: 'client_id and name are required' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    const { data: thread, error } = await admin.from('chat_threads').insert({
      client_id,
      department,
      name,
      thread_type,
      team_name: team_name || null,
      unread_count: 0,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Activity log
    try {
      await admin.from('activity_logs').insert({
        user_name: user.email,
        action: 'created thread',
        entity_type: 'message',
        entity_id: client_id,
        entity_name: name,
      })
    } catch {}

    return NextResponse.json(thread, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
