import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// PATCH /api/projects/[id]/milestones/[mid]
export async function PATCH(req: NextRequest, { params }: { params: { id: string; mid: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const body = await req.json()
    const { data, error } = await admin
      .from('project_milestones')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.mid)
      .eq('project_id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/milestones/[mid]
export async function DELETE(_: NextRequest, { params }: { params: { id: string; mid: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { error } = await admin
      .from('project_milestones')
      .delete()
      .eq('id', params.mid)
      .eq('project_id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
