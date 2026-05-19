import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

// Roles permitted to delete clients
const DELETE_ALLOWED_ROLES = ['Founder', 'Managing Director']

async function getCallerRole(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, user: { email?: string | null }) {
  if (!user.email) return null
  const admin = createAdminSupabaseClient()
  const { data: member } = await admin
    .from('team_members')
    .select('status, roles(name)')
    .eq('email', user.email.toLowerCase())
    .single()
  // No team_members record → platform admin, grant full access
  if (!member) return '__admin__'
  return (member as any)?.roles?.name ?? null
}

// GET /api/clients/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Verify authenticated
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminSupabaseClient()
  const { data, error } = await adminSupabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/clients/[id] — update fields that exist in DB
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const body = await req.json()

  // Remove any fields that might not exist yet
  const { deleted_at, updated_at, ...safeBody } = body

  const { data, error } = await supabase
    .from('clients')
    .update(safeBody)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/clients/[id] — permanently delete (Founder & Managing Director only)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Enforce role-based access: only Founder, Managing Director, or platform admin may delete
  const callerRole = await getCallerRole(supabase, user)
  if (callerRole !== '__admin__' && !DELETE_ALLOWED_ROLES.includes(callerRole ?? '')) {
    return NextResponse.json(
      { error: 'Forbidden: only Founder or Managing Director can delete clients.' },
      { status: 403 }
    )
  }

  // Hard delete — permanently remove the client from the database
  const adminSupabase = createAdminSupabaseClient()
  const { error } = await adminSupabase
    .from('clients')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
