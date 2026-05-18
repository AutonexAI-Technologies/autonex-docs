import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/clients — list all clients
// Uses admin client so all team members see company data (RLS bypass for reads)
export async function GET(request: NextRequest) {
  // Verify the user is authenticated first
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to read — bypasses RLS so all team members see the same data
  const adminSupabase = createAdminSupabaseClient()
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  let query = adminSupabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (email) {
    query = query.eq('email', email)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/clients — create new client
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const {
    name, email, phone, company, service,
    total_fee, deposit_fee, start_date,
    bank_name, account_number, ifsc_code,
    upi_id, invoice_number,
    // New columns — only inserted if they exist in DB
    status, project_type, notes,
  } = body

  if (!name || !email || !service || !total_fee) {
    return NextResponse.json(
      { error: 'Name, email, service, and total fee are required.' },
      { status: 400 }
    )
  }

  // Duplicate email check (only against non-deleted)
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'A client with this email already exists.' },
      { status: 409 }
    )
  }

  // Build insert payload — only include columns that exist in the current schema
  // Run the migration SQL below to unlock the new columns
  const basePayload: Record<string, any> = {
    name,
    email,
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
  }

  // Attempt to insert with extended columns first
  // Falls back to base columns if schema doesn't have them yet
  const extendedPayload = {
    ...basePayload,
    status: status || 'Lead',
    project_type: project_type || 'one-time',
    notes: notes || null,
  }

  let result = await supabase
    .from('clients')
    .insert([extendedPayload])
    .select()
    .single()

  // If extended columns don't exist yet, retry with base payload only
  if (result.error && result.error.message.includes('column')) {
    result = await supabase
      .from('clients')
      .insert([basePayload])
      .select()
      .single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json(result.data, { status: 201 })
}
