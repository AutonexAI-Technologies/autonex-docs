export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/retainers/generate-invoices
 * Generates invoices for all retainers where:
 *   - auto_invoice = true
 *   - next_billing_date <= today (or next_billing_date is null)
 * Can be called manually from UI or via Vercel cron.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)

    // Fetch eligible retainers
    const { data: retainers, error: retErr } = await admin
      .from('retainers')
      .select('*, clients(name, email, service, total_fee)')
      .eq('auto_invoice', true)
      .or(`next_billing_date.is.null,next_billing_date.lte.${today}`)

    if (retErr) return NextResponse.json({ error: retErr.message }, { status: 500 })
    if (!retainers?.length) return NextResponse.json({ message: 'No retainers due for billing', count: 0 })

    const results = []

    for (const retainer of retainers) {
      const client = (retainer as any).clients
      if (!client) continue

      // Generate invoice number
      const invoiceNum = `INV-${Date.now().toString().slice(-6)}-R`

      // Create invoice
      const { data: invoice, error: invErr } = await admin.from('invoices').insert({
        client_id: retainer.client_id,
        invoice_number: invoiceNum,
        amount: retainer.monthly_fee || retainer.amount || 0,
        total: retainer.monthly_fee || retainer.amount || 0,
        status: 'Pending',
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        notes: `Monthly retainer invoice — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
        is_retainer: true,
        retainer_id: retainer.id,
      }).select().single()

      if (invErr) {
        results.push({ retainer_id: retainer.id, error: invErr.message })
        continue
      }

      // Compute next billing date (same day next month)
      const billingDay = retainer.billing_day || 1
      const nextDate = new Date()
      nextDate.setMonth(nextDate.getMonth() + 1)
      nextDate.setDate(billingDay)

      // Update next_billing_date on retainer
      await admin.from('retainers')
        .update({ next_billing_date: nextDate.toISOString().slice(0, 10) })
        .eq('id', retainer.id)

      // Create notification
      await admin.from('notifications').insert({
        title: 'Retainer Invoice Generated',
        message: `Invoice ${invoiceNum} created for ${client.name} — ₹${(retainer.monthly_fee || 0).toLocaleString('en-IN')}`,
        type: 'success', read: false,
      })

      results.push({ retainer_id: retainer.id, invoice_id: invoice?.id, invoice_number: invoiceNum, client: client.name })
    }

    return NextResponse.json({ message: `Generated ${results.filter(r => !r.error).length} invoice(s)`, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/retainers/generate-invoices — preview which retainers are due
 */
export async function GET() {
  try {
    const admin = createAdminSupabaseClient()
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await admin
      .from('retainers')
      .select('id, client_id, monthly_fee, next_billing_date, auto_invoice, billing_day, clients(name)')
      .eq('auto_invoice', true)
      .or(`next_billing_date.is.null,next_billing_date.lte.${today}`)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
