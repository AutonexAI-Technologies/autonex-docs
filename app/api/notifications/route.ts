export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/notifications — company-wide, all roles see same data
export async function GET(req: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient()
    const { data, error } = await adminSupabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    console.error('[GET /api/notifications]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/notifications — create a notification (called internally)
export async function POST(req: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const body = await req.json()

  const { title, message, type, link } = body

  if (!title || !message) {
    return NextResponse.json({ error: 'title and message are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      title,
      message,
      type: type || 'info',
      link: link || null,
      read: false,
    }])
    .select()
    .single()

  if (error) {
    if (error.message.includes('relation') || error.message.includes('schema cache')) {
      return NextResponse.json({ skipped: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const body = await req.json()
  const { ids } = body // optional: specific IDs, or all if not provided

  let query = supabase
    .from('notifications')
    .update({ read: true })

  if (ids?.length) {
    query = query.in('id', ids)
  } else {
    query = query.eq('read', false)
  }

  const { error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
