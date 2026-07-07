export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/support?client_id=xxx&status=open
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const url = new URL(req.url)
    const clientId = url.searchParams.get('client_id')
    const status = url.searchParams.get('status')
    let q = admin.from('support_tickets').select('*, ticket_responses(*)').order('created_at', { ascending: false })
    if (clientId) q = q.eq('client_id', clientId) as any
    if (status) q = q.eq('status', status) as any
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/support — create ticket
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const body = await req.json()
    const { client_id, raised_by, raiser_name, title, description, ticket_type, urgency } = body
    if (!client_id || !title || !description) {
      return NextResponse.json({ error: 'client_id, title, description required' }, { status: 400 })
    }
    const { data, error } = await admin.from('support_tickets').insert({
      client_id, raised_by, raiser_name: raiser_name || 'Client',
      title, description, ticket_type: ticket_type || 'general', urgency: urgency || 'medium',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
