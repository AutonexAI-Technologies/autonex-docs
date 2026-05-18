import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/activity — fetch real activity logs (company-wide)
export async function GET(req: NextRequest) {
  // Verify authenticated
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminSupabaseClient()
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || '100')

  const { data, error } = await adminSupabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (
      error.message.includes('relation') ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    ) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

// POST /api/activity — log an action (called internally)
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const body = await req.json()

  const { user_name, action, entity_type, entity_id, entity_name, metadata } = body

  if (!action || !entity_type) {
    return NextResponse.json({ error: 'action and entity_type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .insert([{
      user_name: user_name || 'System',
      action,
      entity_type,
      entity_id: entity_id || null,
      entity_name: entity_name || null,
      metadata: metadata || null,
    }])
    .select()
    .single()

  if (error) {
    // Silently fail if table doesn't exist yet
    if (error.message.includes('relation') || error.message.includes('schema cache')) {
      return NextResponse.json({ skipped: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
