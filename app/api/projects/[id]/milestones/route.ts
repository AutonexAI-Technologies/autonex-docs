export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/projects/[id]/milestones
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin
      .from('project_milestones')
      .select('*')
      .eq('project_id', params.id)
      .order('sort_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/projects/[id]/milestones
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const body = await req.json()
    const { name, description, status, estimated_date, notes, sort_order } = body

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    // Get project to find client_id
    const { data: project } = await admin.from('projects').select('client_id').eq('id', params.id).single()
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const { data, error } = await admin
      .from('project_milestones')
      .insert({
        project_id: params.id,
        client_id: project.client_id,
        name,
        description: description || null,
        status: status || 'pending',
        estimated_date: estimated_date || null,
        notes: notes || null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
