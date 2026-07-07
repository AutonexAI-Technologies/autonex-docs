export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'
import { addMonths, addQuarters } from 'date-fns'

// GET /api/retainers — company-wide, all roles see same data
export async function GET() {
  try {
    const adminSupabase = createAdminSupabaseClient()
    const { data, error } = await adminSupabase
      .from('retainers')
      .select('*, clients(name, email, company)')
      .order('created_at', { ascending: false })

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    console.error('[GET /api/retainers]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/retainers — create retainer
export async function POST(req: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const { client_id, amount, billing_cycle, start_date } = await req.json()

  if (!client_id || !amount || !start_date) {
    return NextResponse.json(
      { error: 'client_id, amount, and start_date are required.' },
      { status: 400 }
    )
  }

  const startDt = new Date(start_date)
  const next_billing_date =
    billing_cycle === 'quarterly'
      ? addQuarters(startDt, 1).toISOString()
      : addMonths(startDt, 1).toISOString()

  const { data, error } = await supabase
    .from('retainers')
    .insert([{
      client_id,
      amount: Number(amount),
      billing_cycle: billing_cycle || 'monthly',
      start_date,
      next_billing_date,
      status: 'Active',
      total_billed: 0,
    }])
    .select()
    .single()

  if (error) {
    if (
      error.message.includes('relation') ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    ) {
      return NextResponse.json(
        { error: 'The retainers table does not exist yet. Please run the migration SQL.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
