import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/auth/sync
 *
 * Called after every successful signInWithPassword login.
 * Flips the team_member status from 'invited' → 'active' and sets joined_at.
 * This covers the case where members log in directly with credentials
 * (not via magic link / email invite callback).
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the caller is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminSupabaseClient()

    // Find their team_member record
    const { data: member } = await adminSupabase
      .from('team_members')
      .select('id, status, name, role_id, roles(name, departments(name))')
      .eq('email', user.email.toLowerCase())
      .single()

    if (!member) {
      // Not a team member — still valid (could be the super admin)
      return NextResponse.json({ synced: false, reason: 'no_member_record' })
    }

    // Only update if still 'invited'
    if (member.status === 'invited') {
      const name = user.user_metadata?.full_name || user.user_metadata?.invited_name || user.email.split('@')[0]
      const roleName = (member as any).roles?.name || 'Team Member'
      const deptName = (member as any).roles?.departments?.name || ''
      const roleDisplay = deptName ? `${roleName} · ${deptName}` : roleName

      await adminSupabase
        .from('team_members')
        .update({
          status: 'active',
          joined_at: new Date().toISOString(),
          name,
          auth_user_id: user.id,
        })
        .eq('id', member.id)

      // Log the first login
      await adminSupabase.from('activity_logs').insert([{
        user_name: name,
        action: `${name} logged in for the first time as ${roleDisplay}`,
        entity_type: 'team',
        entity_name: name,
      }]).then(() => {})

      await adminSupabase.from('notifications').insert([{
        title: '🎉 New Team Member Active',
        message: `${name} logged in for the first time as ${roleDisplay}`,
        type: 'success',
        read: false,
      }]).then(() => {})

      return NextResponse.json({ synced: true, status: 'active' })
    }

    return NextResponse.json({ synced: false, reason: 'already_active', status: member.status })
  } catch (err: any) {
    console.error('[auth/sync]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
