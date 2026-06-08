import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/teams/[id]/members — list all members with role + capacity
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('team_memberships')
    .select(`
      id, is_lead, role, joined_at,
      team_members (
        id, name, email,
        roles ( name ),
        team_member_capacity ( active_projects, status, status_note )
      )
    `)
    .eq('team_id', params.id)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/teams/[id]/members — add member to team with role
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_member_id, is_lead, role } = await req.json()
  if (!team_member_id) return NextResponse.json({ error: 'team_member_id required' }, { status: 400 })

  // Determine role: explicit role wins, fallback to is_lead → head
  const memberRole = role || (is_lead ? 'head' : 'member')
  const memberIsLead = memberRole === 'head' || is_lead === true

  const { error } = await admin
    .from('team_memberships')
    .upsert(
      [{ team_id: params.id, team_member_id, is_lead: memberIsLead, role: memberRole }],
      { onConflict: 'team_id,team_member_id' }
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Ensure capacity row exists
  await admin
    .from('team_member_capacity')
    .upsert({ user_id: team_member_id }, { onConflict: 'user_id' })

  // Also add member to any existing client threads for this team
  const { data: threads } = await admin
    .from('chat_threads')
    .select('id, thread_type')
    .eq('team_id', params.id)

  if (threads?.length) {
    const membershipRows = threads.map((t: any) => ({
      thread_id: t.id,
      user_id: team_member_id,
      role: memberRole,
    }))
    await admin
      .from('chat_thread_members')
      .upsert(membershipRows, { onConflict: 'thread_id,user_id' })
  }

  return NextResponse.json({ success: true, role: memberRole })
}

// DELETE /api/teams/[id]/members — remove member from team
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_member_id } = await req.json()
  if (!team_member_id) return NextResponse.json({ error: 'team_member_id required' }, { status: 400 })

  const { error } = await admin
    .from('team_memberships')
    .delete()
    .eq('team_id', params.id)
    .eq('team_member_id', team_member_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove from this team's threads
  const { data: threads } = await admin
    .from('chat_threads')
    .select('id')
    .eq('team_id', params.id)

  if (threads?.length) {
    await admin
      .from('chat_thread_members')
      .delete()
      .in('thread_id', threads.map((t: any) => t.id))
      .eq('user_id', team_member_id)
  }

  return NextResponse.json({ success: true })
}
