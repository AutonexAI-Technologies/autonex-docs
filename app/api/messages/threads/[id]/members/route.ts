export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * GET /api/messages/threads/[threadId]/members
 * Returns members assigned to this thread
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('thread_members')
      .select('*')
      .eq('thread_id', params.id)
      .order('added_at')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * POST /api/messages/threads/[threadId]/members
 * Assigns a team member to this thread
 * Body: { team_member_id, member_name, member_email, role_name }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const server = await createServerSupabaseClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { team_member_id, member_name, member_email, role_name } = body
    if (!member_email) return NextResponse.json({ error: 'member_email required' }, { status: 400 })

    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.from('thread_members').upsert({
      thread_id: params.id,
      team_member_id: team_member_id || null,
      member_name,
      member_email,
      role_name,
      added_by: user.id,
    }, { onConflict: 'thread_id,member_email' }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/messages/threads/[threadId]/members?email=x
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const server = await createServerSupabaseClient()
    const { data: { user } } = await server.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const email = new URL(req.url).searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email param required' }, { status: 400 })

    const admin = createAdminSupabaseClient()
    await admin.from('thread_members')
      .delete()
      .eq('thread_id', params.id)
      .eq('member_email', email)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
