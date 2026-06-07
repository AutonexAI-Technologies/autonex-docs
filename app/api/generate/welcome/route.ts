import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'
import { generateWelcomeHTML } from '@/lib/pdf/welcome'
import { generatePDF } from '@/lib/pdf/generator'

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json()
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    const admin = createAdminSupabaseClient()
    const { data: client, error } = await admin.from('clients').select('*').eq('id', clientId).single()
    if (error || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://autonex-docs-8x12.vercel.app'
    const html = await generateWelcomeHTML(client, portalUrl)
    const pdf = await generatePDF(html)

    const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="welcome-${safeName}.pdf"`,
        'Content-Length': pdf.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('[generate/welcome]', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
