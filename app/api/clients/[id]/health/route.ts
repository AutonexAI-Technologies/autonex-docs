export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// PATCH /api/clients/[id]/health
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { rag_status, notes, updated_by } = await req.json()

    // Upsert — create if doesn't exist, update if does
    const { data: existing } = await admin.from('client_health').select('id').eq('client_id', params.id).maybeSingle()

    if (existing) {
      const { data, error } = await admin.from('client_health').update({
        rag_status, notes: notes || null, updated_by, updated_at: new Date().toISOString(),
      }).eq('client_id', params.id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    } else {
      const { data, error } = await admin.from('client_health').insert({
        client_id: params.id, rag_status, notes: notes || null, updated_by,
      }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data, { status: 201 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/clients/[id]/health
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data, error } = await admin.from('client_health').select('*').eq('client_id', params.id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? { rag_status: 'green', notes: null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
