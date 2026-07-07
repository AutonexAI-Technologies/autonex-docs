export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/announcements
export async function GET() {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.from('announcements').select('*')
      .order('pinned', { ascending: false }).order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/announcements
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const { title, content, author_id, author_name, pinned, expires_at } = await req.json()
    if (!title || !content) return NextResponse.json({ error: 'title and content required' }, { status: 400 })
    const { data, error } = await admin.from('announcements').insert({
      title, content, author_id, author_name: author_name || 'Autonex AI',
      pinned: pinned || false, expires_at: expires_at || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
