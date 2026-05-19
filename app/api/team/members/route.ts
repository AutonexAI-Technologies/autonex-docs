import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// ─── GET /api/team/members ───────────────────────────────────────────────────
export async function GET() {
  // Admin client bypasses RLS so ALL team members see the full company team list
  const adminSupabase = createAdminSupabaseClient()
  const { data, error } = await adminSupabase
    .from('team_members')
    .select(`
      id, name, email, status, joined_at, created_at,
      role_id,
      roles ( id, name, department_id, departments ( name ) )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[GET /api/team/members] Error:', error.message)
    if (
      error.message.includes('relation') ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    ) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formatted = (data ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    status: m.status,
    joined_at: m.joined_at,
    role_id: m.role_id,
    role_name: m.roles?.name ?? null,
    department_name: m.roles?.departments?.name ?? null,
  }))

  return NextResponse.json(formatted)
}


// ─── POST /api/team/members — invite (new or re-invite) ─────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, role_id, name } = body

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const adminSupabase = createAdminSupabaseClient()
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL || 'https://autonex-docs.vercel.app'

  // ── Resolve role + department name for email ────────────────────────────────
  let roleName = 'Team Member'
  let deptName = ''
  if (role_id) {
    const { data: roleRow } = await adminSupabase
      .from('roles')
      .select('name, departments(name)')
      .eq('id', role_id)
      .single()
    if (roleRow) {
      roleName = (roleRow as any).name || roleName
      deptName = (roleRow as any).departments?.name || ''
    }
  }
  const roleDisplay = deptName ? `${roleName} · ${deptName}` : roleName

  // ── 1. Generate a random password ─────────────────────────────────────────
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const randomPassword = Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('') + '@1'   // e.g. "XkPmQrHnBvJw@1" — always has letter+number+symbol

  // ── 2. Create or update Supabase auth user (NO email sent by Supabase) ────
  let authUserId: string | null = null
  let isNewUser = true

  const { data: userList } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = userList?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existingUser) {
    isNewUser = false
    authUserId = existingUser.id
    // Reset their password to the new random one
    await adminSupabase.auth.admin.updateUserById(existingUser.id, {
      password: randomPassword,
    })
  } else {
    const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,   // auto-confirm so they can log in immediately
      user_metadata: { invited_name: name || '', role_id: role_id || null },
    })
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 400 })
    }
    authUserId = newUser?.user?.id ?? null
  }

  // ── 3. Save to team_members DB ─────────────────────────────────────────
  // If role_id not provided (e.g. resend), look up the existing member's role
  // so we NEVER accidentally wipe their role on a re-invite.
  let resolvedRoleId = role_id || null
  if (!resolvedRoleId) {
    const { data: existingMember } = await adminSupabase
      .from('team_members')
      .select('role_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()
    resolvedRoleId = existingMember?.role_id ?? null
  }

  const memberData = {
    auth_user_id: authUserId,
    email: email.toLowerCase().trim(),
    name: name || email.split('@')[0],
    role_id: resolvedRoleId,
    status: 'invited' as const,
    joined_at: null as string | null,
  }

  const { error: upsertError } = await adminSupabase
    .from('team_members')
    .upsert([memberData], { onConflict: 'email' })

  if (upsertError) {
    if (upsertError.message.includes('relation') || upsertError.message.includes('schema cache')) {
      return NextResponse.json({ error: 'Run the SQL migration first.' }, { status: 503 })
    }
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // ── 4. Send branded email with login credentials via Resend ───────────────
  let emailSent = false
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const firstName = (name || email).split(' ')[0]

    const result = await resend.emails.send({
      from: 'Autonex AI <noreply@autonexai.org>',
      to: email,
      subject: `🎉 You're invited to Autonex AI — Your login credentials`,
      html: buildCredentialsEmail({ firstName, email, password: randomPassword, roleDisplay, appUrl, isNew: isNewUser }),
    })
    if (result.error) {
      console.warn('[POST] Resend error:', JSON.stringify(result.error))
      emailSent = false
    } else {
      emailSent = true
      console.log('[POST] Email sent to:', email)
    }
  } catch (emailErr: any) {
    console.warn('[POST] Email exception:', emailErr?.message || emailErr)
    emailSent = false
  }

  // ── 5. Activity log + notification ────────────────────────────────────────
  const actorName = 'Admin'

  await adminSupabase.from('activity_logs').insert([{
    user_name: actorName,
    action: `Invited ${name || email} to join as ${roleDisplay}`,
    entity_type: 'team',
    entity_name: name || email,
  }]).then(() => {})

  await adminSupabase.from('notifications').insert([{
    title: 'Team Invite Sent',
    message: `Invite sent to ${email} for role: ${roleDisplay}`,
    type: 'success',
    read: false,
  }]).then(() => {})

  // Return credentials in response so admin can see/copy them if email failed
  return NextResponse.json({
    success: true,
    emailSent,
    credentials: { email, password: randomPassword, role: roleDisplay },
    message: emailSent
      ? `Credentials emailed to ${email} as ${roleDisplay}.`
      : `Account created for ${email} (${roleDisplay}). Email failed — share credentials below.`,
  })
}

// ─── DELETE /api/team/members — hard delete from DB ─────────────────────────
export async function DELETE(req: NextRequest) {
  const adminSupabase = createAdminSupabaseClient()
  const { id }        = await req.json()

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  // Fetch member before deleting
  const { data: member } = await adminSupabase
    .from('team_members')
    .select('name, email, auth_user_id')
    .eq('id', id)
    .single()

  // Hard delete
  const { error: delError } = await adminSupabase
    .from('team_members')
    .delete()
    .eq('id', id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  // Log
  const actorName2 = 'Admin'

  await adminSupabase.from('activity_logs').insert([{
    user_name: actorName2,
    action: `Removed ${member?.name || member?.email} from the team`,
    entity_type: 'team',
    entity_name: member?.name || member?.email || 'Unknown',
  }]).then(() => {})

  await adminSupabase.from('notifications').insert([{
    title: 'Team Member Removed',
    message: `${member?.name || member?.email} was removed by ${actorName2}`,
    type: 'warning',
    read: false,
  }]).then(() => {})

  return NextResponse.json({ success: true })
}

// ─── PATCH /api/team/members — update role ──────────────────────────────────
export async function PATCH(req: NextRequest) {
  const adminSupabase = createAdminSupabaseClient()
  const { id, role_id } = await req.json()

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await adminSupabase
    .from('team_members')
    .update({ role_id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// ─── Branded invite email template ──────────────────────────────────────────
function buildCredentialsEmail({
  firstName,
  email,
  password,
  roleDisplay,
  appUrl,
  isNew,
}: {
  firstName: string
  email: string
  password: string
  roleDisplay: string
  appUrl: string
  isNew: boolean
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.14);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0a1628,#1a3a6b);padding:40px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">Autonex AI</div>
    <div style="font-size:10px;color:#60a5fa;letter-spacing:4px;text-transform:uppercase;margin-top:6px;">Internal Operations Platform</div>
    <div style="margin-top:20px;font-size:40px;">🎉</div>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:40px;">
    <h1 style="font-size:24px;font-weight:800;color:#0a1628;margin:0 0 8px;">
      ${isNew ? `Welcome, ${firstName}!` : `Welcome back, ${firstName}!`}
    </h1>
    <p style="font-size:15px;color:#475569;line-height:1.8;margin:0 0 24px;">
      You've been ${isNew ? 'invited to join' : 're-added to'} the
      <strong style="color:#0a1628;">Autonex AI Operations Platform</strong>
      as <strong style="color:#2563eb;">${roleDisplay}</strong>.
    </p>

    <!-- Credentials Box -->
    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:16px;padding:28px;margin:0 0 24px;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:800;color:#16a34a;text-transform:uppercase;letter-spacing:1.5px;">
        🔐 Your Login Credentials
      </p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#166534;width:100px;font-weight:600;">Email</td>
          <td style="padding:10px 0;font-size:15px;color:#0a1628;font-weight:700;">${email}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#166534;font-weight:600;">Password</td>
          <td style="padding:10px 0;">
            <code style="background:#dcfce7;padding:6px 14px;border-radius:8px;font-size:16px;font-weight:800;color:#0a1628;letter-spacing:1px;border:1px solid #86efac;">${password}</code>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#166534;font-weight:600;">Role</td>
          <td style="padding:10px 0;font-size:15px;color:#2563eb;font-weight:700;">${roleDisplay}</td>
        </tr>
      </table>
    </div>

    <!-- Login Button -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="${appUrl}/login"
        style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-size:16px;font-weight:700;padding:16px 44px;border-radius:14px;text-decoration:none;box-shadow:0 4px 20px rgba(37,99,235,0.35);">
        Login to Platform →
      </a>
    </div>

    <!-- Warning -->
    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;">
      <p style="margin:0;font-size:12px;color:#92400e;">
        ⚠️ <strong>Keep your credentials safe.</strong> Do not share your password with anyone.
        Contact <a href="mailto:autonexai.org@gmail.com" style="color:#d97706;">autonexai.org@gmail.com</a> if you need help.
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

