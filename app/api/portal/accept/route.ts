import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/portal/accept
 * Accepts a portal invite — creates the auth user and portal_user record.
 * Body: { token, password, name, phone? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const { token, password, name, phone } = await request.json()

    if (!token || !password || !name) {
      return NextResponse.json({ error: 'token, password, and name are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Validate invite
    const { data: invite, error: invErr } = await admin
      .from('portal_invites')
      .select('*')
      .eq('token', token)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invErr || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    // Create auth user with client metadata
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      app_metadata: {
        user_type: 'client',
        client_id: invite.client_id,
        portal_role: invite.portal_role,
      },
      user_metadata: {
        name,
        phone: phone || null,
      },
    })

    if (authErr) {
      // User might already exist
      if (authErr.message.includes('already been registered')) {
        return NextResponse.json({ error: 'This email is already registered. Please sign in instead.' }, { status: 409 })
      }
      return NextResponse.json({ error: authErr.message }, { status: 500 })
    }

    // Create portal_user record
    const { error: puErr } = await admin.from('portal_users').insert({
      user_id: authData.user.id,
      client_id: invite.client_id,
      name,
      email: invite.email,
      phone: phone || null,
      portal_role: invite.portal_role,
      invited_by: invite.invited_by,
    })

    if (puErr) {
      console.error('Failed to create portal_user:', puErr)
    }

    // Mark invite as accepted
    await admin.from('portal_invites').update({ accepted: true }).eq('id', invite.id)

    return NextResponse.json({
      message: 'Account created successfully',
      user_id: authData.user.id,
      email: invite.email,
    }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/portal/accept]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
