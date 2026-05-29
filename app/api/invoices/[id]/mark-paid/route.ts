import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = createAdminSupabaseClient()
  const body = await req.json().catch(() => ({}))
  const { payment_method, paid_at } = body

  const { data, error } = await admin
    .from('invoices')
    .update({
      status: 'Paid',
      payment_method: payment_method || 'Bank Transfer',
      paid_at: paid_at || new Date().toISOString(),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
