export const dynamic = 'force-dynamic'
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

    const html = await generateInvoiceHTML(client, invoice, PORTAL_URL)
    const pdfBuffer = await generatePDF(html)

    const invoiceNum = invoice.invoice_number || 'Invoice'
    const totalFormatted = `₹${(invoice.total || 0).toLocaleString('en-IN')}`
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Within 15 days'

    // Status color — no green
    const statusColor =
      invoice.status === 'Paid' ? '#0060FF'
      : invoice.status === 'Overdue' ? '#DC2626'
      : invoice.status === 'Cancelled' ? '#6B7280'
      : '#D97706'

    const { data: emailData, error: emailErr } = await resend.emails.send({
      from: FROM,
      to: [client.email],
      subject: `Invoice ${invoiceNum} from Autonex AI — ${totalFormatted}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#F0F4FB;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F0F4FB;padding:32px 16px">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

    <!-- HEADER -->
    <tr>
      <td style="background:linear-gradient(135deg,#0A1628,#1A3566);border-radius:16px 16px 0 0;padding:24px 36px 22px;text-align:center">
        <img src="https://portal.autonexai.org/logo.png" alt="Autonex AI" width="52" height="52" style="display:block;margin:0 auto 10px;border-radius:10px" />
        <div style="display:inline-flex;align-items:center;justify-content:center;gap:6px">
          <span style="font-size:22px;font-weight:900;color:#ffffff;font-family:Arial,sans-serif;letter-spacing:-0.5px">Autonex</span><span style="background:#ffffff;color:#1A3566;font-size:14px;font-weight:900;border-radius:5px;padding:2px 8px;font-family:Arial,sans-serif;vertical-align:middle">AI</span>
        </div>
        <div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:2.5px;text-transform:uppercase;margin-top:8px">Technologies</div>
      </td>
    </tr>

    <!-- BLUE ACCENT BAR -->
    <tr><td style="background:linear-gradient(90deg,#3B82F6,#0060FF);height:4px;font-size:0;line-height:0">&nbsp;</td></tr>

    <!-- BODY -->
    <tr>
      <td style="background:#ffffff;padding:36px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 16px 16px">

        <!-- Greeting -->
        <p style="font-size:19px;font-weight:700;color:#0A1628;margin:0 0 8px">Hi ${client.name.split(' ')[0]} 👋</p>
        <p style="font-size:14px;color:#556080;line-height:1.7;margin:0 0 28px">Your invoice from Autonex AI is ready. The PDF is attached — review the details below.</p>

        <!-- Amount Box -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F8FF;border:1px solid #E4E9F8;border-left:4px solid #0060FF;border-radius:10px;margin-bottom:24px">
          <tr>
            <td style="padding:18px 22px">
              <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;margin:0 0 6px">Amount Due</p>
              <p style="font-size:30px;font-weight:900;color:#0060FF;margin:0">${totalFormatted}</p>
              <p style="font-size:12px;color:#888;margin:5px 0 0">Due by: ${dueDate}</p>
            </td>
          </tr>
        </table>

        <!-- Details Table -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9FAFF;border-radius:10px;margin-bottom:24px">
          <tr>
            <td style="padding:16px 20px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                   <td width="40%" style="padding:8px 0 8px;border-bottom:1px solid #EEF1F8;font-size:13px;color:#666;text-align:left">Invoice No.</td>
                   <td width="60%" style="padding:8px 0 8px;border-bottom:1px solid #EEF1F8;font-size:13px;font-weight:700;color:#0060FF;font-family:monospace;text-align:right">${invoiceNum}</td>
                 </tr>
                 <tr>
                   <td width="40%" style="padding:8px 0 8px;border-bottom:1px solid #EEF1F8;font-size:13px;color:#666;text-align:left">Service</td>
                   <td width="60%" style="padding:8px 0 8px;border-bottom:1px solid #EEF1F8;font-size:13px;font-weight:700;color:#0A1628;text-align:right">${client.service || 'Professional Services'}</td>
                 </tr>
                ${invoice.gst_enabled ? `<tr>
                  <td width="40%" style="padding:7px 0;border-bottom:1px solid #EEF1F8;font-size:13px;color:#666;text-align:left">GST (18%)</td>
                  <td width="60%" style="padding:7px 0;border-bottom:1px solid #EEF1F8;font-size:13px;font-weight:700;color:#0A1628;text-align:right">₹${(invoice.gst_amount || 0).toLocaleString('en-IN')}</td>
                </tr>` : ''}
                <tr>
                  <td width="40%" style="padding:7px 0;font-size:13px;color:#666;text-align:left">Status</td>
                  <td width="60%" style="padding:7px 0;font-size:13px;font-weight:700;color:${statusColor};text-align:right">${invoice.status}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">
          <tr>
            <td align="center">
              <a href="${PORTAL_URL}/invoices" style="display:inline-block;background:#0060FF;color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none">View Invoice in Portal →</a>
            </td>
          </tr>
        </table>

        <!-- Note -->
        <p style="font-size:12px;color:#888;line-height:1.7;text-align:center;margin:0">
          PDF invoice is attached to this email.<br/>
          Payment via Bank Transfer or UPI — details on the invoice.<br/>
          Questions? Reply here or write to <strong>hello@autonexai.org</strong>
        </p>

      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="text-align:center;padding:20px 0">
        <p style="font-size:11px;color:#94A3B8;margin:0;line-height:1.8">
          Autonex AI Technologies · Hyderabad, Telangana<br/>
          <a href="${PORTAL_URL}" style="color:#0060FF;text-decoration:none">autonexai.org</a>
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`,
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
