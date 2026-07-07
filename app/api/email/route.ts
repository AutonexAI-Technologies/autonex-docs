export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'
import { sendDocumentEmail } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  try {
    const { clientId, docType, pdfBase64, docTitle } = await request.json()

    if (!clientId || !docType || !pdfBase64) {
      return NextResponse.json(
        { error: 'clientId, docType, and pdfBase64 are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await sendDocumentEmail(client, docType, pdfBase64, docTitle)

    return NextResponse.json({ success: true, sentTo: client.email })
  } catch (err: any) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: err.message || 'Email sending failed' }, { status: 500 })
  }
}
