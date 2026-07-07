export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/clients/[id]/notes
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.from('internal_notes').select('*')
      .eq('client_id', params.id)
      .order('pinned', { ascending: false }).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/clients/[id]/notes
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { author_id, author_name, content, pinned } = await req.json()
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })
    const { data, error } = await admin.from('internal_notes').insert({
      client_id: params.id, author_id, author_name: author_name || 'Team',
      content, pinned: pinned || false,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
