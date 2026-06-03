import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/teams — list all teams with department + member count
export async function GET() {
  const admin = createAdminSupabaseClient()
  const { data, error } = await admin
    .from('teams')
    .select(`
      id, name, color, description, created_at,
      department_id,
      departments ( id, name ),
      team_memberships (
        id, is_lead,
        team_members ( id, name, email, role_id, roles ( name ) )
      )
    `)
    .order('created_at', { ascending: true })

  if (error) {
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data ?? [])
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest) {
  const admin = createAdminSupabaseClient()
  const { name, department_id, color, description } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Team name required' }, { status: 400 })

  const { data, error } = await admin
    .from('teams')
    .insert([{ name: name.trim(), department_id: department_id || null, color: color || '#3b82f6', description: description || null }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('activity_logs').insert([{
    user_name: 'Admin',
    action: `Created team "${name.trim()}"`,
    entity_type: 'team',
    entity_name: name.trim(),
  }])

  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/teams — delete a team by id
export async function DELETE(req: NextRequest) {
  const admin = createAdminSupabaseClient()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: team } = await admin.from('teams').select('name').eq('id', id).single()
  const { error } = await admin.from('teams').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('activity_logs').insert([{
    user_name: 'Admin',
    action: `Deleted team "${team?.name}"`,
    entity_type: 'team',
    entity_name: team?.name || id,
  }])

  return NextResponse.json({ success: true })
}
