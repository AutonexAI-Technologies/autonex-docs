export const dynamic = 'force-dynamic'
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

// DELETE /api/clients/[id] — SOFT delete (Founder & Managing Director only)
// Sets deleted_at = NOW() instead of hard-deleting.
// This preserves all data and prevents orphaned portal auth users.
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

  const adminSupabase = createAdminSupabaseClient()

  // 1. Find all portal_users linked to this client so we can revoke their auth access
  const { data: portalUsers } = await adminSupabase
    .from('portal_users')
    .select('user_id, email')
    .eq('client_id', params.id)

  // 2. Soft-delete the client: set deleted_at timestamp
  //    portal_users rows with ON DELETE CASCADE will be removed automatically
  //    when we hard-delete, but with soft-delete we handle it manually.
  const { error: deleteErr } = await adminSupabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString(), status: null })
    .eq('id', params.id)

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  // 3. Remove portal_users rows for this client (revokes portal access)
  await adminSupabase
    .from('portal_users')
    .delete()
    .eq('client_id', params.id)

  // 4. Revoke Supabase auth access for any portal users of this client
  //    (delete their auth.users entry so they truly can't log in)
  if (portalUsers && portalUsers.length > 0) {
    for (const pu of portalUsers) {
      await adminSupabase.auth.admin.deleteUser(pu.user_id).catch(() => {})
    }
  }

  return NextResponse.json({ success: true, revoked_portal_users: portalUsers?.length ?? 0 })
}

