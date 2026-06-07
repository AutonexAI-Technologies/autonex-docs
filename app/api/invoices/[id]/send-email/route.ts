import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'
import { generateInvoiceHTML } from '@/lib/pdf/invoice'
import { generatePDF } from '@/lib/pdf/generator'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.FROM_EMAIL || 'Autonex AI <hello@autonexai.org>'
const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://autonex-docs-8x12.vercel.app'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()

    // Fetch invoice + client
    const { data: invoice, error: invErr } = await admin
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', params.id)
      .single()

    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const client = (invoice as any).clients
    if (!client?.email) {
      return NextResponse.json({ error: 'Client email not found' }, { status: 400 })
    }

    // Generate PDF
    const html = await generateInvoiceHTML(client, invoice, PORTAL_URL)
    const pdfBuffer = await generatePDF(html)

    const invoiceNum = invoice.invoice_number || 'Invoice'
    const totalFormatted = `₹${(invoice.total || 0).toLocaleString('en-IN')}`
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Within 15 days'

    // Send email with PDF attachment
    const { data: emailData, error: emailErr } = await resend.emails.send({
      from: FROM,
      to: [client.email],
      subject: `Invoice ${invoiceNum} from Autonex AI — ${totalFormatted}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;background:#F4F6FB;padding:32px 16px;color:#1a1a2e}
.wrap{max-width:540px;margin:0 auto}
.header{background:#0A0F1E;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center}
.logo-text{font-size:22px;font-weight:900;color:white;letter-spacing:-0.5px}
.logo-text span{color:#00D4AA}
.body{background:white;padding:32px;border-radius:0 0 16px 16px;border:1px solid #E4E9F8}
.greeting{font-size:18px;font-weight:700;color:#0A0F1E;margin-bottom:8px}
.sub{font-size:14px;color:#555;line-height:1.7;margin-bottom:24px}
.amount-box{background:#F6F8FF;border:1px solid #E4E9F8;border-left:4px solid #0060FF;border-radius:10px;padding:18px 22px;margin-bottom:24px}
.amount-label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;margin-bottom:6px}
.amount-val{font-size:28px;font-weight:900;color:#0060FF}
.amount-sub{font-size:12px;color:#888;margin-top:4px}
.details{background:#F9FAFF;border-radius:10px;padding:16px 20px;margin-bottom:24px}
.detail-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #F0F3FA;font-size:13px}
.detail-row:last-child{border-bottom:none}
.detail-row span{color:#666}
.detail-row strong{color:#0A0F1E}
.cta{display:block;text-align:center;background:#0060FF;color:white;font-size:14px;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:20px}
.note{font-size:12px;color:#888;line-height:1.7;text-align:center;margin-bottom:24px}
.footer{text-align:center;font-size:11px;color:#aaa;margin-top:24px;line-height:1.8}
</style>
</head>
<body><div class="wrap">
<div class="header">
  <div class="logo-text">Autonex<span> AI</span></div>
  <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px">autonexai.org</div>
</div>
<div class="body">
  <div class="greeting">Hi ${client.name.split(' ')[0]} 👋</div>
  <p class="sub">Your invoice from Autonex AI is ready. Please find the attached PDF and review the details below.</p>

  <div class="amount-box">
    <div class="amount-label">Amount Due</div>
    <div class="amount-val">${totalFormatted}</div>
    <div class="amount-sub">Due by: ${dueDate}</div>
  </div>

  <div class="details">
    <div class="detail-row"><span>Invoice No.</span><strong style="color:#0060FF;font-family:monospace">${invoiceNum}</strong></div>
    <div class="detail-row"><span>Service</span><strong>${client.service || 'Professional Services'}</strong></div>
    ${invoice.gst_enabled ? `<div class="detail-row"><span>GST (18%)</span><strong>₹${(invoice.gst_amount || 0).toLocaleString('en-IN')}</strong></div>` : ''}
    <div class="detail-row"><span>Status</span><strong style="color:${invoice.status === 'Paid' ? '#10b981' : '#f59e0b'}">${invoice.status}</strong></div>
  </div>

  <a href="${PORTAL_URL}/invoices" class="cta">View Invoice in Portal →</a>

  <p class="note">
    The PDF invoice is attached to this email.<br/>
    Payment via Bank Transfer or UPI — details on the invoice.<br/>
    Questions? Reply to this email or write to <strong>hello@autonexai.org</strong>
  </p>
</div>
<div class="footer">
  Autonex AI Technologies · Hyderabad, Telangana<br/>
  <a href="${PORTAL_URL}" style="color:#0060FF;text-decoration:none">autonexai.org</a>
</div>
</div></body></html>`,
      attachments: [
        {
          filename: `${invoiceNum}-${client.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    })

    if (emailErr) {
      return NextResponse.json({ error: emailErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: client.email, emailId: emailData?.id })
  } catch (err: any) {
    console.error('[invoices/send-email]', err)
    return NextResponse.json({ error: err.message || 'Send failed' }, { status: 500 })
  }
}
