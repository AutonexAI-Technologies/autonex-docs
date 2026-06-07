import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createAdminSupabaseClient()
  const { data, error } = await adminSupabase
    .from('invoices')
    .select('*, clients(name, email, company, phone, bank_name, account_number, ifsc_code, upi_id)')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const body = await req.json()

  // Recalculate totals if line items changed
  if (body.line_items) {
    body.subtotal = body.line_items.reduce((s: number, i: any) => s + i.quantity * i.rate, 0)
    body.gst_amount = body.gst_enabled ? Math.round(body.subtotal * 0.18) : 0
    body.total = body.subtotal + body.gst_amount
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('invoices').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
