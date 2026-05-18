import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { generateThankyouHTML } from '@/lib/pdf/thankyou'
import { generatePDF } from '@/lib/pdf/generator'

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json()
    if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: client, error } = await supabase.from('clients').select('*').eq('id', clientId).single()
    if (error || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const html = generateThankyouHTML(client)
    const pdf = await generatePDF(html)

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="thankyou-${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf"`,
        'Content-Length': pdf.length.toString(),
      },
    })
  } catch (err: any) {
    console.error('Thankyou generation error:', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
