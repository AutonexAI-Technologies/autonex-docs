export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'
import { generateInvoiceHTML } from '@/lib/pdf/invoice'
import { generatePDF } from '@/lib/pdf/generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, invoiceId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 })
    }

    const admin = createAdminSupabaseClient()

    // Fetch client
    const { data: client, error: clientErr } = await admin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Fetch specific invoice or latest for client
    let invoice: any = null
    if (invoiceId) {
      const { data } = await admin.from('invoices').select('*').eq('id', invoiceId).single()
      invoice = data
    } else {
      const { data } = await admin
        .from('invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      invoice = data
    }

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://autonex-docs-8x12.vercel.app'

    // generateInvoiceHTML is now async (generates QR code)
    const html = await generateInvoiceHTML(client, invoice || undefined, portalUrl)
    const pdf = await generatePDF(html)

    const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const invNum = invoice?.invoice_number || 'invoice'

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invNum}-${safeName}.pdf"`,
        'Content-Length': pdf.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('[generate/invoice]', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
