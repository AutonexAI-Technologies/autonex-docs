export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// POST /api/support/[id]/respond
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { author_id, author_name, author_type, content } = await req.json()
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

    // Get ticket to find client_id
    const { data: ticket } = await admin.from('support_tickets').select('client_id').eq('id', params.id).single()
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const { data, error } = await admin.from('ticket_responses').insert({
      ticket_id: params.id, client_id: ticket.client_id,
      author_id, author_name: author_name || 'Team',
      author_type: author_type || 'team', content,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Auto-update ticket status to in_progress if it was open
    await admin.from('support_tickets').update({
      status: 'in_progress', updated_at: new Date().toISOString(),
    }).eq('id', params.id).eq('status', 'open')

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
