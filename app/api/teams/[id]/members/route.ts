import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/teams/[id]/members
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('team_memberships')
    .select(`id, is_lead, joined_at, team_members ( id, name, email, roles ( name ) )`)
    .eq('team_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/teams/[id]/members — add member to team
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_member_id, is_lead } = await req.json()
  if (!team_member_id) return NextResponse.json({ error: 'team_member_id required' }, { status: 400 })

  const { error } = await admin
    .from('team_memberships')
    .upsert([{ team_id: params.id, team_member_id, is_lead: is_lead ?? false }], { onConflict: 'team_id,team_member_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/teams/[id]/members — remove member from team
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_member_id } = await req.json()
  const { error } = await admin
    .from('team_memberships')
    .delete()
    .eq('team_id', params.id)
    .eq('team_member_id', team_member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
