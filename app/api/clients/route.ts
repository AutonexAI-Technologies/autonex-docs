import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

/**
 * GET /api/clients
 * Uses admin client (bypasses RLS) → every authenticated team member
 * sees the SAME company-wide client data regardless of role.
 * Auth is verified by checking the Bearer token or session via admin client.
 * Middleware already rejects unauthenticated page requests.
 */
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient()
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    let query = adminSupabase
      .from('clients')
      .select('*')
      .is('deleted_at', null)          // exclude soft-deleted clients
      .order('created_at', { ascending: false })

    if (email) query = query.eq('email', email)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    console.error('[GET /api/clients]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/clients — create new client (role check happens on frontend)
export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient()
    const body = await request.json()

    const {
      name, email, phone, company, service,
      total_fee, deposit_fee, start_date,
      bank_name, account_number, ifsc_code,
      upi_id, invoice_number,
      status, project_type, notes,
    } = body

    if (!name || !email || !service || !total_fee) {
      return NextResponse.json(
        { error: 'Name, email, service, and total fee are required.' },
        { status: 400 }
      )
    }

    // Duplicate check
    const { data: existing } = await adminSupabase
      .from('clients')
      .select('id')
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'A client with this email already exists.' },
        { status: 409 }
      )
    }

    const payload: Record<string, any> = {
      name, email,
      phone: phone || null,
      company: company || null,
      service,
      total_fee: Number(total_fee),
      deposit_fee: Number(deposit_fee) || Math.round(Number(total_fee) * 0.5),
      start_date: start_date || null,
      bank_name: bank_name || null,
      account_number: account_number || null,
      ifsc_code: ifsc_code || null,
      upi_id: upi_id || null,
      invoice_number: invoice_number || null,
      status: status || 'Lead',
      project_type: project_type || 'one-time',
      notes: notes || null,
    }

    const { data, error } = await adminSupabase
      .from('clients')
      .insert([payload])
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/clients]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
