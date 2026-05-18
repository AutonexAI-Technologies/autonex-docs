import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { payment_method, paid_at } = await req.json()

  const { data, error } = await supabase
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
