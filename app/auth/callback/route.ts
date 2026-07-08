import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

function getPortalUrl(origin: string) {
  // Local development: portal runs on port+1
  if (origin.startsWith('http://localhost:')) {
    const portMatch = origin.match(/:(\d+)$/)
    if (portMatch) {
      const port = parseInt(portMatch[1], 10)
      return `http://localhost:${port + 1}`
    }
    return 'http://localhost:3001'
  }

  // Production: explicit mapping of known CRM → Portal URLs
  const PRODUCTION_PORTAL_URL = 'https://autonex-docs-8x12.vercel.app'
  return process.env.NEXT_PUBLIC_PORTAL_URL || PRODUCTION_PORTAL_URL
}

/**
 * GET /auth/callback
 *
 * Called after:
 *  - Invite acceptance (user clicks link + sets password)
 *  - Magic link / Password reset
 *
 * Flow:
 *  1. Exchange code for session
 *  2. Mark team_member as 'active' (joined_at = now)
 *  3. Send "Thank you for onboarding" confirmation email
 *  4. Redirect to /dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')        // 'recovery' for password reset
  const next = searchParams.get('next') ?? (type === 'recovery' ? '/change-password' : '/dashboard')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin
  const response = NextResponse.redirect(`${origin}${next}`)

  if (!code) return response

  const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // 1. Exchange code for session
  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (sessionError || !sessionData?.user) {
    console.error('[auth/callback] Code exchange failed:', sessionError?.message)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const user  = sessionData.user
  const email = user.email ?? ''

  // Check if they are a team member
  const { data: memberRow } = await supabase
    .from('team_members')
    .select('id, status, role_id, roles(name, departments(name))')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  // If not a team member, redirect to portal's auth callback with session tokens
  if (!memberRow) {
    const portalBase = getPortalUrl(origin)
    const portalCallbackUrl = new URL(`${portalBase}/auth/callback`)
    portalCallbackUrl.searchParams.set('access_token', sessionData.session?.access_token || '')
    portalCallbackUrl.searchParams.set('refresh_token', sessionData.session?.refresh_token || '')
    if (type) portalCallbackUrl.searchParams.set('type', type)
    portalCallbackUrl.searchParams.set('next', type === 'recovery' ? '/settings' : '/dashboard')
    
    return NextResponse.redirect(portalCallbackUrl.toString())
  }

  // For password recovery, redirect immediately after session is established
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/change-password`, { headers: response.headers })
  }

  const name  = (
    user.user_metadata?.full_name ||
    user.user_metadata?.invited_name ||
    email.split('@')[0] ||
    'Team Member'
  )

  if (!email) return response

  const wasInvited = memberRow?.status === 'invited'
  const roleName   = (memberRow as any)?.roles?.name || 'Team Member'
  const deptName   = (memberRow as any)?.roles?.departments?.name || ''
  const roleDisplay = deptName ? `${roleName} · ${deptName}` : roleName

  // 3. Mark as active
  if (memberRow && (memberRow.status === 'invited' || memberRow.status === 'inactive')) {
    await supabase
      .from('team_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        name,
        auth_user_id: user.id,
      })
      .eq('email', email.toLowerCase())

    console.log('[auth/callback] Marked member active:', email)
  }

  // 4. Send "Thank you for onboarding" email (only first time)
  if (wasInvited) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const firstName = name.split(' ')[0]

      // Generate change-password link
      const adminSupabase = createAdminSupabaseClient()
      const { data: resetData } = await adminSupabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${appUrl}/auth/callback?next=/dashboard` },
      })
      const changePasswordUrl = resetData?.properties?.action_link || `${appUrl}/login`

      await resend.emails.send({
        from: 'Autonex AI <noreply@autonexai.org>',
        to: email,
        subject: `✅ You're all set, ${firstName}! Welcome to Autonex AI`,
        html: buildThankYouEmail({ firstName, roleDisplay, appUrl, changePasswordUrl }),
      })
      console.log('[auth/callback] Thank-you email sent to:', email)
    } catch (err) {
      console.error('[auth/callback] Thank-you email failed:', err)
    }
  }

  // 5. Activity log + notification
  await supabase.from('activity_logs').insert([{
    user_name: name,
    action: wasInvited
      ? `${name} accepted their invite and joined as ${roleDisplay}`
      : `${name} logged in`,
    entity_type: 'team',
    entity_name: name,
  }]).then(() => {})

  if (wasInvited) {
    await supabase.from('notifications').insert([{
      title: '🎉 New Team Member Joined',
      message: `${name} accepted their invite and joined as ${roleDisplay}`,
      type: 'success',
      read: false,
    }]).then(() => {})
  }

  return response
}

// ─── Thank You / Onboarding Confirmation Email ──────────────────────────────
function buildThankYouEmail({
  firstName,
  roleDisplay,
  appUrl,
  changePasswordUrl,
}: {
  firstName: string
  roleDisplay: string
  appUrl: string
  changePasswordUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.14);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0a1628,#1a3a6b);padding:40px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">Autonex AI</div>
    <div style="font-size:10px;color:#60a5fa;letter-spacing:4px;text-transform:uppercase;margin-top:6px;">Operations Platform</div>
    <div style="margin-top:24px;font-size:48px;">✅</div>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:40px;">
    <h1 style="font-size:26px;font-weight:800;color:#0a1628;margin:0 0 12px;">
      Thank you for onboarding, ${firstName}!
    </h1>
    <p style="font-size:15px;color:#475569;line-height:1.8;margin:0 0 8px;">
      Your account is now <strong style="color:#16a34a;">active</strong> on the
      <strong>Autonex AI Internal Operations Platform</strong>.
    </p>
    <p style="font-size:15px;color:#475569;line-height:1.8;margin:0 0 28px;">
      You have been assigned the role of <strong style="color:#2563eb;">${roleDisplay}</strong>.
    </p>

    <!-- Quick access -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${appUrl}/dashboard"
        style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:14px;text-decoration:none;box-shadow:0 4px 20px rgba(37,99,235,0.35);">
        Open Dashboard →
      </a>
    </div>

    <!-- Account details -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:24px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">
        Your Account
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#166534;width:120px;">Status</td>
          <td style="padding:6px 0;font-size:13px;color:#166534;font-weight:700;">✅ Active</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#166534;">Role</td>
          <td style="padding:6px 0;font-size:13px;color:#166534;font-weight:700;">${roleDisplay}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#166534;">Platform</td>
          <td style="padding:6px 0;font-size:13px;"><a href="${appUrl}" style="color:#16a34a;font-weight:600;">${appUrl}</a></td>
        </tr>
      </table>
    </div>

    <!-- Change password -->
    <div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:13px;color:#1e40af;font-weight:700;">🔐 Want to change your password?</p>
      <p style="margin:0 0 14px;font-size:12px;color:#475569;">
        Click below to set a new password. You can also use "Forgot Password" on the login page anytime.
      </p>
      <a href="${changePasswordUrl}"
        style="display:inline-block;background:#2563eb;color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:10px;text-decoration:none;">
        Change Password →
      </a>
    </div>

    <!-- Support -->
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;font-size:12px;color:#92400e;">
        Need help? Contact the admin at <a href="mailto:autonexai.org@gmail.com" style="color:#d97706;">autonexai.org@gmail.com</a>
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#f8faff;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      © 2026 Autonex AI Technologies · Hyderabad, India
    </p>
  </div>
</div>
</body>
</html>`
}
