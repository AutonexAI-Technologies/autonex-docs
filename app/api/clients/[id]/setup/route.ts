import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/clients/[id]/setup
 * Seeds default onboarding checklist, chat threads, and project for a client.
 * Called after client creation to bootstrap their workspace.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createAdminSupabaseClient()
    const clientId = params.id
    const body = await request.json().catch(() => ({}))

    // Verify client exists
    const { data: client, error: clientErr } = await admin
      .from('clients')
      .select('id, name, service')
      .eq('id', clientId)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const results: Record<string, string> = {}

    // 1. Create default chat threads
    const { error: threadErr } = await admin.rpc('create_default_chat_threads', {
      p_client_id: clientId,
    })
    results.chat_threads = threadErr ? `Error: ${threadErr.message}` : 'Created'

    // 2. Create default onboarding checklist
    const { error: onboardErr } = await admin.rpc('create_default_onboarding', {
      p_client_id: clientId,
    })
    results.onboarding = onboardErr ? `Error: ${onboardErr.message}` : 'Created'

    // 3. Create default project with milestones + health record
    const projectName = body.project_name || `${client.name} — ${client.service || 'Project'}`
    const serviceType = body.service_type || client.service || 'Custom'

    const { data: projectId, error: projErr } = await admin.rpc('create_default_project', {
      p_client_id: clientId,
      p_name: projectName,
      p_service_type: serviceType,
    })
    results.project = projErr ? `Error: ${projErr.message}` : `Created (${projectId})`

    return NextResponse.json({
      message: 'Client workspace seeded successfully',
      client_id: clientId,
      results,
    })
  } catch (err: any) {
    console.error('[POST /api/clients/[id]/setup]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
