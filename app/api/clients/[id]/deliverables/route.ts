export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/clients/[id]/deliverables
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.from('files').select('*')
      .eq('client_id', params.id).eq('is_deliverable', true)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/clients/[id]/deliverables — mark file as deliverable + set approval
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { file_id, approval_status } = await req.json()
    if (!file_id) return NextResponse.json({ error: 'file_id required' }, { status: 400 })
    const { data, error } = await admin.from('files').update({
      is_deliverable: true,
      approval_status: approval_status || 'pending',
    }).eq('id', file_id).eq('client_id', params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
