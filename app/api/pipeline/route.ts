import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/pipeline — all clients grouped by pipeline status
export async function GET() {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('clients')
      .select('id, name, company, email, service, total_fee, status, pipeline_stage, priority, start_date, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/pipeline — update client pipeline stage (Kanban drag-drop)
export async function PATCH(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const { client_id, status, pipeline_stage, priority } = await req.json()
    if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 })

    const update: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status !== undefined) update.status = status
    if (pipeline_stage !== undefined) update.pipeline_stage = pipeline_stage
    if (priority !== undefined) update.priority = priority

    const { data, error } = await admin
      .from('clients')
      .update(update)
      .eq('id', client_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
