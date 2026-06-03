import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/clients/[id]/assignments — list teams assigned to this client
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('client_assignments')
    .select(`
      id, brief, assigned_by, assigned_at,
      teams ( id, name, color, department_id, departments ( name ) )
    `)
    .eq('client_id', params.id)
    .order('assigned_at', { ascending: false })

  if (error) {
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

// POST /api/clients/[id]/assignments — assign teams to client (simultaneous)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_ids, brief, assigned_by } = await req.json()

  if (!team_ids?.length) return NextResponse.json({ error: 'team_ids required' }, { status: 400 })

  const rows = team_ids.map((tid: string) => ({
    client_id: params.id,
    team_id: tid,
    brief: brief || null,
    assigned_by: assigned_by || 'Admin',
  }))

  const { error } = await admin
    .from('client_assignments')
    .upsert(rows, { onConflict: 'client_id,team_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get client name for notifications
  const { data: client } = await admin.from('clients').select('name').eq('id', params.id).single()
  const { data: teams } = await admin.from('teams').select('name').in('id', team_ids)
  const teamNames = teams?.map((t: any) => t.name).join(', ') || ''

  // Activity log
  await admin.from('activity_logs').insert([{
    user_name: assigned_by || 'Admin',
    action: `Assigned ${client?.name || 'client'} to ${teamNames}`,
    entity_type: 'assignment',
    entity_name: client?.name || params.id,
  }])

  // Notification for team leads
  for (const tid of team_ids) {
    const { data: leads } = await admin
      .from('team_memberships')
      .select('team_members ( name, email )')
      .eq('team_id', tid)
      .eq('is_lead', true)

    if (leads?.length) {
      for (const lead of leads) {
        const leadName = (lead as any).team_members?.name || 'Team Lead'
        await admin.from('notifications').insert([{
          title: '📋 New Client Assigned',
          message: `${client?.name || 'A client'} has been assigned to your team.`,
          type: 'info',
          read: false,
        }])
      }
    }
  }

  return NextResponse.json({ success: true, count: team_ids.length })
}

// DELETE /api/clients/[id]/assignments — remove a team assignment
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_id } = await req.json()
  if (!team_id) return NextResponse.json({ error: 'team_id required' }, { status: 400 })

  const { error } = await admin
    .from('client_assignments')
    .delete()
    .eq('client_id', params.id)
    .eq('team_id', team_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
