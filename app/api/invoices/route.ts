export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/invoices — all team members see company-wide invoices (admin client bypasses RLS)
export async function GET(req: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient()
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('client_id')

    let query = adminSupabase
      .from('invoices')
      .select('*, clients(name, email)')
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    console.error('[GET /api/invoices]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/invoices — create invoice
export async function POST(req: NextRequest) {
  const supabase = createAdminSupabaseClient()
  const body = await req.json()

  // Get next invoice number
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (lastInvoice?.invoice_number) {
    const match = lastInvoice.invoice_number.match(/ANX-(\d+)/)
    if (match) nextNum = parseInt(match[1]) + 1
  }
  const invoice_number = `ANX-${String(nextNum).padStart(3, '0')}`

  const {
    client_id, line_items, gst_enabled, due_date, notes,
    is_retainer_invoice, retainer_period, status,
  } = body

  if (!client_id || !line_items?.length) {
    return NextResponse.json(
      { error: 'client_id and at least one line item are required.' },
      { status: 400 }
    )
  }

  const subtotal = line_items.reduce(
    (s: number, i: any) => s + Number(i.quantity) * Number(i.rate),
    0
  )
  const gst_amount = gst_enabled ? Math.round(subtotal * 0.18) : 0
  const total = subtotal + gst_amount

  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      invoice_number,
      client_id,
      line_items,          // JSONB column — pass array directly, no stringify
      subtotal,
      gst_enabled: !!gst_enabled,
      gst_amount,
      total,
      status: status || 'Pending',
      due_date: due_date || null,
      notes: notes || null,
      is_retainer_invoice: !!is_retainer_invoice,
      retainer_period: retainer_period || null,
    }])
    .select()
    .single()

  if (error) {
    // Log full error so we can debug in terminal
    console.error('[POST /api/invoices] Supabase error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })

    if (
      error.message.includes('relation') ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache') ||
      error.code === '42P01'  // undefined_table postgres code
    ) {
      return NextResponse.json(
        { error: 'invoices table missing — run NOTIFY pgrst, \'reload schema\'; in Supabase SQL editor' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: error.message, code: error.code, hint: error.hint }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
