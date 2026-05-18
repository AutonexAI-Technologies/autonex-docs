import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

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

// DELETE /api/clients/[id] — soft delete if column exists, otherwise hard delete
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()

  // Try soft delete first
  const softDelete = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)

  // If deleted_at column doesn't exist, do a real delete
  if (softDelete.error && softDelete.error.message.includes('column')) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (softDelete.error) {
    return NextResponse.json({ error: softDelete.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
