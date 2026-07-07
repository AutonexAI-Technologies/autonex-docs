export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  let pw = ''
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) pw += chars[bytes[i] % chars.length]
  return pw
}

function buildCredentialsEmail({ clientDisplayName, email, password, client, portalUrl }: {
  clientDisplayName: string, email: string, password: string,
  client: { name: string; company?: string | null }, portalUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4fa;font-family:Arial,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4fa;min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Logo Header -->
        <tr><td style="background:linear-gradient(135deg,#0a1628,#1a3566);border-radius:16px 16px 0 0;padding:24px 40px 20px;text-align:center;">
          <img src="https://autonex-docs-8x12.vercel.app/logo.png" alt="Autonex AI" width="52" height="52" style="display:block;margin:0 auto 10px;border-radius:10px" />
          <div style="display:inline-flex;align-items:center;justify-content:center;gap:6px">
            <span style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-1px;font-family:Arial,sans-serif;">Autonex</span><span style="display:inline-block;background:#ffffff;color:#1a3566;font-size:14px;font-weight:900;border-radius:5px;padding:3px 9px;font-family:Arial,sans-serif;vertical-align:middle;line-height:1.4;">AI</span>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:3px;text-transform:uppercase;margin-top:8px;">Client Portal</div>
        </td></tr>
        <!-- Blue accent bar -->
        <tr><td style="background:linear-gradient(90deg,#3B82F6,#0060FF);height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Card -->
        <tr><td style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:40px;box-shadow:0 4px 16px rgba(15,23,42,0.06);">
          <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 8px;">Welcome to your Portal! 🎉</h1>
          <p style="color:#64748b;font-size:15px;margin:0 0 24px;line-height:1.6;">
            Hi <strong style="color:#0f172a;">${clientDisplayName}</strong>, your Autonex AI Client Portal is ready.
            Use the credentials below to sign in and track your project, view invoices, share files, and communicate with your team.
          </p>
          <!-- Credentials Box -->
          <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin:0 0 24px;">
            <p style="color:#64748b;font-size:11px;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;">Your Login Credentials</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;">
                  <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Email</span><br/>
                  <span style="color:#0f172a;font-size:16px;font-weight:600;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0 8px;border-top:1px solid #e2e8f0;margin-top:8px;">
                  <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Password</span><br/>
                  <code style="color:#1D4ED8;font-size:20px;font-weight:700;background:#eff6ff;padding:6px 14px;border-radius:10px;display:inline-block;margin-top:6px;letter-spacing:0.05em;">${password}</code>
                </td>
              </tr>
            </table>
          </div>
          <!-- Project -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:0 0 24px;">
            <p style="color:#64748b;font-size:11px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">Project</p>
            <p style="color:#0f172a;font-size:16px;font-weight:600;margin:0;">${client.company || client.name}</p>
          </div>
          <a href="${portalUrl}/login" style="display:block;text-align:center;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;margin:0 0 16px;">
            Sign In to My Portal →
          </a>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0 0 6px;">We recommend changing your password after first login.</p>
          <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;word-break:break-all;">Portal: ${portalUrl}/login</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} Autonex AI Technologies · Invitation-only access</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}


/**
 * POST /api/portal/invite
 * Creates a portal user with credentials and sends them an email with login details.
 * Body: { client_id, email, name?, portal_role? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const supabase = await createServerSupabaseClient()

    // Verify caller is authenticated
    const { data: { user: caller } } = await supabase.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { client_id, email, name, portal_role = 'client_viewer' } = await request.json()

    if (!client_id || !email) {
      return NextResponse.json({ error: 'client_id and email are required' }, { status: 400 })
    }

    // Verify client exists
    const { data: client } = await admin
      .from('clients')
      .select('id, name, company, email')
      .eq('id', client_id)
      .single()

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientDisplayName = name || client.name
    const password = generatePassword()

    // Create Supabase auth user directly with the generated password
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        user_type: 'client',
        client_id,
        portal_role,
      },
      user_metadata: {
        name: clientDisplayName,
      },
    })

    if (authErr) {
      if (authErr.message.includes('already been registered') || authErr.message.includes('already registered')) {
        // User exists — reset their password and resend credentials
        const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = userList?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingUser) {
          // Reset password to new generated one
          await admin.auth.admin.updateUserById(existingUser.id, {
            password,
            app_metadata: { user_type: 'client', client_id, portal_role },
            user_metadata: { name: clientDisplayName },
          })

          // Upsert portal_users so the greeting + dashboard work correctly
          await admin.from('portal_users').upsert({
            user_id: existingUser.id,
            client_id,
            name: clientDisplayName,
            email,
            portal_role,
            invited_by: caller.id,
          }, { onConflict: 'user_id' })

          // Resend credentials email
          const portalUrl2 = 'https://autonex-docs-8x12.vercel.app'
          try {
            const { Resend } = await import('resend')
            const resend2 = new Resend(process.env.RESEND_API_KEY)
            await resend2.emails.send({
              from: 'Autonex AI <noreply@autonexai.org>',
              to: email,
              subject: `Your Autonex AI Portal — Updated Credentials`,
              html: buildCredentialsEmail({ clientDisplayName, email, password, client, portalUrl: portalUrl2 }),
            })
          } catch {}
          return NextResponse.json({
            message: 'Credentials reset and resent to existing user',
            user_id: existingUser.id,
            email,
            portal_url: 'https://autonex-docs-8x12.vercel.app/login',
            resent: true,
          }, { status: 200 })
        }
      }
      return NextResponse.json({ error: authErr.message }, { status: 500 })
    }


    // Create portal_user record
    await admin.from('portal_users').insert({
      user_id: authData.user.id,
      client_id,
      name: clientDisplayName,
      email,
      portal_role,
      invited_by: caller.id,
    })

    // Also create invite record for tracking (mark as accepted immediately)
    await admin.from('portal_invites').insert({
      client_id,
      email,
      portal_role,
      invited_by: caller.id,
      accepted: true,
    })

    const portalUrl = 'https://autonex-docs-8x12.vercel.app'

    // Send credentials email via Resend
    try {
      await resend.emails.send({
        from: 'Autonex AI <noreply@autonexai.org>',
        to: email,
        subject: `Your Autonex AI Client Portal Credentials`,
        html: buildCredentialsEmail({ clientDisplayName, email, password, client, portalUrl }),
      })
    } catch (emailErr: any) {
      console.error('[Resend error]', emailErr)
    }

    return NextResponse.json({
      message: 'Portal account created and credentials sent',
      user_id: authData.user.id,
      email,
      portal_url: `${portalUrl}/login`,
    }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/portal/invite]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/portal/invite?token=xxx
 * Validates an invite token (kept for backward compatibility).
 */
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const token = new URL(request.url).searchParams.get('token')

    if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

    const { data: invite, error } = await admin
      .from('portal_invites')
      .select('*, clients(name, company)')
      .eq('token', token)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
    }

    return NextResponse.json({
      invite_id: invite.id,
      email: invite.email,
      portal_role: invite.portal_role,
      client_name: (invite as any).clients?.name,
      company: (invite as any).clients?.company,
      expires_at: invite.expires_at,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
