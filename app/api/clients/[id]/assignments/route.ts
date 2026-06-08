import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/clients/[id]/assignments
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()

  const { data, error } = await admin
    .from('client_assignments')
    .select(`id, brief, assigned_by, assigned_at, teams ( id, name, color, departments ( name ) )`)
    .eq('client_id', params.id)
    .order('assigned_at', { ascending: false })

  if (error) return NextResponse.json([])

  // Enrich with team members (separate query — safe without role column)
  const enriched = await Promise.all((data ?? []).map(async (a: any) => {
    if (!a.teams?.id) return a
    const { data: members } = await admin
      .from('team_memberships')
      .select(`id, is_lead, team_members ( id, name, email )`)
      .eq('team_id', a.teams.id)
    return { ...a, teams: { ...a.teams, team_memberships: members ?? [] } }
  }))

  return NextResponse.json(enriched)
}

// POST /api/clients/[id]/assignments — assign teams + create chat threads
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_ids, brief, assigned_by } = await req.json()
  if (!team_ids?.length) return NextResponse.json({ error: 'team_ids required' }, { status: 400 })

  const { data: client } = await admin.from('clients').select('name').eq('id', params.id).single()
  const clientName = client?.name || 'Client'

  const results: any[] = []

  for (const teamId of team_ids) {
    // 1. Upsert client_assignment (safe insert — skip if duplicate)
    const { data: assignment, error: aErr } = await admin
      .from('client_assignments')
      .insert({ client_id: params.id, team_id: teamId, brief: brief || null, assigned_by: assigned_by || 'Admin' })
      .select()
      .single()

    if (aErr && !aErr.message.includes('duplicate') && !aErr.message.includes('unique')) {
      return NextResponse.json({ error: aErr.message }, { status: 500 })
    }

    // 2. Get team name + members
    const { data: team } = await admin
      .from('teams').select('name').eq('id', teamId).single()
    const teamName = team?.name || 'Team'

    const { data: memberships } = await admin
      .from('team_memberships').select('team_member_id').eq('team_id', teamId)
    const memberIds = memberships?.map((m: any) => m.team_member_id) ?? []

    // 3. Create client-facing thread: "ClientName — TeamName"
    const { data: clientThread } = await admin
      .from('chat_threads')
      .insert({
        client_id: params.id,
        team_id: teamId,
        name: `${clientName} — ${teamName}`,
        department: 'general',
        type: 'team',
        thread_type: 'client',
      })
      .select('id')
      .single()

    // 4. Create internal thread: "Internal — ClientName — TeamName"
    const { data: internalThread } = await admin
      .from('chat_threads')
      .insert({
        client_id: params.id,
        team_id: teamId,
        name: `Internal — ${clientName} — ${teamName}`,
        department: 'general',
        type: 'team',
        thread_type: 'internal',
      })
      .select('id')
      .single()

    // 5. Add all team members to both threads
    for (const memberId of memberIds) {
      if (clientThread?.id) {
        try { await admin.from('chat_thread_members').insert({ thread_id: clientThread.id, user_id: memberId }) } catch (_) {}
      }
      if (internalThread?.id) {
        try { await admin.from('chat_thread_members').insert({ thread_id: internalThread.id, user_id: memberId }) } catch (_) {}
      }
      try {
        await admin.from('team_member_capacity')
          .upsert({ user_id: memberId, active_projects: 1, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      } catch (_) {}
    }

    results.push({ teamId, teamName, clientThreadId: clientThread?.id, internalThreadId: internalThread?.id })
  }

  // Activity log
  try {
    await admin.from('activity_logs').insert([{
      user_name: assigned_by || 'Admin',
      action: `Assigned teams to ${clientName}`,
      entity_type: 'assignment',
      entity_name: clientName,
    }])
  } catch (_) {}

  return NextResponse.json({ success: true, results })
}

// DELETE /api/clients/[id]/assignments
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const { team_id } = await req.json()
  if (!team_id) return NextResponse.json({ error: 'team_id required' }, { status: 400 })

  // Remove thread members + threads
  const { data: threads } = await admin
    .from('chat_threads').select('id').eq('client_id', params.id).eq('team_id', team_id)
  if (threads?.length) {
    for (const t of threads) {
      try { await admin.from('chat_thread_members').delete().eq('thread_id', t.id) } catch (_) {}
      try { await admin.from('chat_threads').delete().eq('id', t.id) } catch (_) {}
    }
  }

  // Remove assignment
  const { error } = await admin
    .from('client_assignments').delete().eq('client_id', params.id).eq('team_id', team_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
