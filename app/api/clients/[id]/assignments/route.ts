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

// POST /api/clients/[id]/assignments — assign teams to client
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_ids, brief, assigned_by } = await req.json()

  if (!team_ids?.length) return NextResponse.json({ error: 'team_ids required' }, { status: 400 })

  // 1. Upsert client_assignments
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

  // 2. Get names for logging
  const { data: client } = await admin.from('clients').select('name').eq('id', params.id).single()
  const { data: teams }  = await admin.from('teams').select('id, name').in('id', team_ids)
  const teamNames = teams?.map((t: any) => t.name).join(', ') || ''

  // 3. For each team: call assign_team_to_client RPC
  //    This creates chat threads (client + internal) and adds ALL members
  const threadResults: any[] = []
  for (const tid of team_ids) {
    const { data: rpcData, error: rpcErr } = await admin
      .rpc('assign_team_to_client', {
        p_client_id: params.id,
        p_team_id: tid,
      })

    if (rpcErr) {
      console.warn('[assignments] RPC assign_team_to_client error:', rpcErr.message)
    } else {
      threadResults.push(rpcData)
    }

    // 4. Update team_member_capacity: increment active_projects for all members
    const { data: memberships } = await admin
      .from('team_memberships')
      .select('team_member_id')
      .eq('team_id', tid)

    if (memberships?.length) {
      for (const m of memberships) {
        // Ensure capacity row exists (upsert with default active_projects=1)
        await admin
          .from('team_member_capacity')
          .upsert({
            user_id: m.team_member_id,
            active_projects: 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
      }
    }
  }

  // 5. Activity log
  await admin.from('activity_logs').insert([{
    user_name: assigned_by || 'Admin',
    action: `Assigned ${client?.name || 'client'} to ${teamNames}`,
    entity_type: 'assignment',
    entity_name: client?.name || params.id,
  }])

  return NextResponse.json({
    success: true,
    count: team_ids.length,
    threads: threadResults,
  })
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

  // Remove thread members for this client+team when unassigned
  const { data: threads } = await admin
    .from('chat_threads')
    .select('id')
    .eq('client_id', params.id)
    .eq('team_id', team_id)

  if (threads?.length) {
    const threadIds = threads.map((t: any) => t.id)
    await admin.from('chat_thread_members').delete().in('thread_id', threadIds)
  }

  return NextResponse.json({ success: true })
}
