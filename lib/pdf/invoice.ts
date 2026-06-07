import QRCode from 'qrcode'
import { Client } from '@/types'

interface InvoiceData {
  invoice_number?: string
  line_items?: Array<{ description: string; quantity: number; rate: number; amount: number }> | string
  total_amount?: number  // legacy — prefer total
  total?: number
  gst_amount?: number
  gst_enabled?: boolean
  due_date?: string
  notes?: string
  status?: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

export async function generateInvoiceHTML(client: Client, invoice?: InvoiceData, portalUrl?: string): Promise<string> {
  const invoiceNum = invoice?.invoice_number || client.invoice_number || 'ANX-001'
  const issueDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const isPaid = invoice?.status === 'Paid'

  let dueDate = 'Net 15 days'
  let dueDateRaw: Date | null = null
  if (invoice?.due_date) {
    dueDateRaw = new Date(invoice.due_date)
    dueDate = dueDateRaw.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  const isOverdue = !isPaid && dueDateRaw && dueDateRaw < new Date()

  // line_items can be a JSON string (from DB) or already an array
  const rawItems = invoice?.line_items
  const parsedItems: Array<{ description: string; quantity: number; rate: number; amount: number }> =
    typeof rawItems === 'string'
      ? (() => { try { return JSON.parse(rawItems) } catch { return [] } })()
      : Array.isArray(rawItems) ? rawItems : []

  const lineItems = parsedItems.length
    ? parsedItems
    : [{
        description: client.service || 'Professional Services',
        quantity: 1,
        rate: client.deposit_fee || client.total_fee * 0.5,
        amount: client.deposit_fee || client.total_fee * 0.5,
      }]

  const subtotal = lineItems.reduce((s, r) => s + (r.amount || r.quantity * r.rate), 0)
  const gstAmount = invoice?.gst_amount || 0
  const total = invoice?.total || subtotal + gstAmount
  const gstEnabled = invoice?.gst_enabled || gstAmount > 0

  // QR code → links to client portal invoices page
  const qrUrl = portalUrl || 'https://autonex-docs-8x12.vercel.app'
  const qrDataUri = await QRCode.toDataURL(`${qrUrl}/invoices`, {
    width: 80, margin: 1,
    color: { dark: '#0A0F1E', light: '#FFFFFF' },
  })

  // Inline SVG logo
  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="38" viewBox="0 0 150 38">
    <rect x="0" y="5" width="28" height="28" rx="6" fill="#0060FF"/>
    <text x="8" y="25" font-size="17" font-weight="900" font-family="Arial" fill="#FFFFFF">A</text>
    <text x="34" y="25" font-size="18" font-weight="800" font-family="Arial,sans-serif" fill="white" letter-spacing="-0.5">Autonex</text>
    <text x="112" y="25" font-size="18" font-weight="800" font-family="Arial,sans-serif" fill="#60A5FA" letter-spacing="-0.5"> AI</text>
  </svg>`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice ${invoiceNum} — Autonex AI Technologies</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,'Segoe UI',sans-serif;background:#ffffff;color:#1a1a2e;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:794px;margin:0 auto;min-height:1123px;display:flex;flex-direction:column;position:relative;overflow:hidden}

/* PAID watermark */
.watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:96px;font-weight:900;color:rgba(16,185,129,0.08);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:0;font-family:Arial}
.watermark.overdue{color:rgba(239,68,68,0.08)}

/* HEADER */
.header{background:#0A0F1E;padding:26px 44px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
.header-right{text-align:right}
.inv-word{font-size:32px;font-weight:900;color:#ffffff;letter-spacing:-1.5px;line-height:1}
.inv-num{font-size:13px;color:#60A5FA;font-weight:700;margin-top:5px;letter-spacing:1px;font-family:monospace}
.inv-status{display:inline-block;margin-top:5px;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
.inv-status.paid{background:#0060FF;color:white}
.inv-status.overdue{background:#ef4444;color:white}
.inv-status.pending{background:#f59e0b;color:white}

/* GRADIENT BAR */
.bar{height:4px;background:linear-gradient(90deg,#3B82F6 0%,#0060FF 60%,#7c3aed 100%);position:relative;z-index:1}

/* META STRIP */
.meta{display:flex;justify-content:space-between;align-items:stretch;padding:20px 44px;background:#F6F8FF;border-bottom:1px solid #E4E9F8;position:relative;z-index:1}
.meta-item{flex:1}
.meta-item:last-child{text-align:right}
.meta-item label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;margin-bottom:5px}
.meta-item .val{font-size:14px;font-weight:800;color:#0A0F1E}
.meta-item .sub{font-size:10px;color:#888;margin-top:2px}
.amount-big{font-size:28px;font-weight:900;color:#0060FF;line-height:1.1}

/* BODY */
.body{padding:28px 44px;flex:1;position:relative;z-index:1}

/* PARTIES */
.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:26px}
.party{padding:16px 20px;border-radius:12px;border:1px solid #E4E9F8;background:#F9FAFF}
.party-from{border-left:3px solid #0060FF}
.party-to{border-left:3px solid #60A5FA}
.party-label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:10px}
.party-label.from{color:#0060FF}
.party-label.to{color:#60A5FA}
.party-name{font-size:15px;font-weight:800;color:#0A0F1E;margin-bottom:5px}
.party p{font-size:11px;color:#555;margin-bottom:2px}
.party .gstin{font-size:10px;color:#0060FF;font-weight:700;margin-top:6px}

/* SECTION HEADING */
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:12px;margin-top:22px;page-break-inside:avoid;page-break-after:avoid}
.sec-head span{font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#0060FF;font-weight:700;white-space:nowrap;word-spacing:0}
.sec-head::after{content:'';flex:1;height:1px;background:#E4E9F8}

/* TABLE */
.tbl{width:100%;border-collapse:collapse}
.tbl thead tr{background:#0A0F1E}
.tbl th{padding:10px 14px;font-size:10px;font-weight:700;color:#fff;text-align:left;letter-spacing:.5px}
.tbl th.r,.tbl td.r{text-align:right}
.tbl th.c,.tbl td.c{text-align:center}
.tbl td{padding:11px 14px;font-size:12.5px;border-bottom:1px solid #F0F3FA;color:#1a1a2e}
.tbl td .dsub{font-size:10px;color:#888;margin-top:2px}
.tbl .sub-row td{background:#F6F8FF;font-size:12px;color:#555;padding:8px 14px}
.tbl .gst-row td{background:#F6F8FF;font-size:12px;color:#555;padding:8px 14px}
.tbl .total-row td{background:#0A0F1E;color:#fff;font-size:14px;font-weight:800;padding:12px 14px}
.tbl .total-row td.r{color:#60A5FA;font-size:18px}

/* BOTTOM GRID */
.bottom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:22px}

/* PAYMENT BOX */
.pay-box{padding:16px 18px;border-radius:12px;border:1px solid #E4E9F8;background:#F9FAFF}
.pay-box h3{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;margin-bottom:11px}
.pay-row{display:flex;justify-content:space-between;margin-bottom:7px;font-size:11px}
.pay-row span{color:#666}
.pay-row strong{color:#0A0F1E;font-weight:700}

/* QR BOX */
.qr-box{padding:16px 18px;border-radius:12px;border:1px solid #E4E9F8;background:#F9FAFF;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center}
.qr-box h3{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700}
.qr-box p{font-size:9px;color:#888;line-height:1.5}

/* NOTES */
.note{background:#FFF9EC;border:1px solid #FFE0A0;border-radius:10px;padding:12px 16px;margin-top:18px}
.note p{font-size:11px;color:#7A5C00;line-height:1.7}

/* SIGNATURE */
.sig-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:28px;padding-top:20px;border-top:1px solid #E4E9F8}
.sig-box{text-align:center;min-width:180px}
.sig-line{width:180px;border-bottom:1.5px solid #0A0F1E;margin:0 auto 8px;height:38px}
.sig-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px}
.sig-name{font-size:11px;font-weight:700;color:#0A0F1E;margin-top:3px}
.sig-date{font-size:10px;color:#aaa;margin-top:2px}

/* FOOTER */
.footer{background:#0A0F1E;padding:13px 44px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
.footer p{font-size:10px;color:rgba(255,255,255,0.4)}
.footer .hi{color:#60A5FA;font-weight:700}
</style></head>
<body><div class="page">

${isPaid ? '<div class="watermark">PAID</div>' : isOverdue ? '<div class="watermark overdue">OVERDUE</div>' : ''}

<!-- HEADER -->
<div class="header">
  <div>${logo}</div>
  <div class="header-right">
    <div class="inv-word">INVOICE</div>
    <div class="inv-num">${invoiceNum}</div>
    <div class="inv-status ${isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending'}">${isPaid ? '✓ Paid' : isOverdue ? '⚠ Overdue' : '● Pending'}</div>
  </div>
</div>
<div class="bar"></div>

<!-- META STRIP -->
<div class="meta">
  <div class="meta-item">
    <label>Issue Date</label>
    <div class="val">${issueDate}</div>
  </div>
  <div class="meta-item" style="text-align:center">
    <label>Due Date</label>
    <div class="val" style="${isOverdue ? 'color:#ef4444' : ''}">${dueDate}</div>
    <div class="sub">${isOverdue ? '⚠ Past due' : 'Net 15 days'}</div>
  </div>
  <div class="meta-item">
    <label>Amount Due</label>
    <div class="amount-big">₹${fmt(total)}</div>
    ${gstEnabled ? `<div class="sub">Incl. GST ₹${fmt(gstAmount)}</div>` : ''}
  </div>
</div>

<!-- BODY -->
<div class="body">

  <!-- PARTIES -->
  <div class="parties">
    <div class="party party-from">
      <div class="party-label from">Billed From</div>
      <div class="party-name">Autonex AI Technologies</div>
      <p>hello@autonexai.org</p>
      <p>autonexai.org</p>
      <p>Hyderabad, Telangana — 500032</p>
      ${gstEnabled ? '<div class="gstin">GSTIN: [YOUR-GSTIN]</div>' : ''}
    </div>
    <div class="party party-to">
      <div class="party-label to">Billed To</div>
      <div class="party-name">${client.name}</div>
      <p>${client.email}</p>
      ${client.phone ? `<p>${client.phone}</p>` : ''}
      ${client.company ? `<p>${client.company}</p>` : ''}
    </div>
  </div>

  <!-- LINE ITEMS -->
  <div class="sec-head"><span>Invoice Details</span></div>
  <table class="tbl">
    <thead>
      <tr>
        <th style="width:48%">Description</th>
        <th class="c" style="width:12%">Qty</th>
        <th class="r" style="width:20%">Rate (₹)</th>
        <th class="r" style="width:20%">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${lineItems.map(item => `
      <tr>
        <td>${item.description}<div class="dsub">Professional Services · Autonex AI Technologies</div></td>
        <td class="c">${item.quantity}</td>
        <td class="r">₹${fmt(item.rate)}</td>
        <td class="r">₹${fmt(item.amount || item.quantity * item.rate)}</td>
      </tr>`).join('')}
      <tr class="sub-row">
        <td colspan="3">Subtotal</td>
        <td class="r">₹${fmt(subtotal)}</td>
      </tr>
      ${gstEnabled ? `<tr class="gst-row"><td colspan="3">GST @ 18%</td><td class="r">₹${fmt(gstAmount)}</td></tr>` : ''}
      <tr class="total-row">
        <td colspan="3">TOTAL AMOUNT DUE</td>
        <td class="r">₹${fmt(total)}</td>
      </tr>
    </tbody>
  </table>

  <!-- BOTTOM GRID: Bank + UPI + QR -->
  <div class="bottom">
    <div class="pay-box">
      <h3>Bank Transfer</h3>
      ${client.bank_name ? `<div class="pay-row"><span>Bank</span><strong>${client.bank_name}</strong></div>` : ''}
      ${client.account_number ? `<div class="pay-row"><span>Account</span><strong>${client.account_number}</strong></div>` : ''}
      ${client.ifsc_code ? `<div class="pay-row"><span>IFSC</span><strong>${client.ifsc_code}</strong></div>` : ''}
      ${!client.bank_name ? '<p style="color:#aaa;font-size:11px">Details shared separately</p>' : ''}
    </div>
    <div class="pay-box">
      <h3>UPI Payment</h3>
      ${client.upi_id
        ? `<div class="pay-row"><span>UPI ID</span><strong>${client.upi_id}</strong></div>
           <p style="font-size:10px;color:#888;margin-top:8px">Scan any UPI app to pay</p>`
        : '<p style="color:#aaa;font-size:11px">UPI ID shared separately</p>'}
    </div>
    <div class="qr-box">
      <h3>View Online</h3>
      <img src="${qrDataUri}" width="72" height="72" alt="QR Code" style="border-radius:6px"/>
      <p>Scan to view &amp; download<br/>this invoice in your portal</p>
    </div>
  </div>

  ${invoice?.notes ? `<div class="note"><p>📝 <strong>Note:</strong> ${invoice.notes}</p></div>` : `
  <div class="note">
    <p>⚠️ <strong>Payment Terms:</strong> Due within 15 days of issue date. Work commences only after payment confirmation. Late payments attract 1.5%/month interest. Queries: <strong>hello@autonexai.org</strong></p>
  </div>`}

  <!-- SIGNATURE -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Client Signature</div>
      <div class="sig-name">${client.name}</div>
      <div class="sig-date">Date: ___________</div>
    </div>
    <div style="text-align:center;padding-bottom:8px">
      <div style="font-size:10px;color:#aaa;margin-bottom:6px">Invoice ${invoiceNum}</div>
      <div style="font-size:10px;color:#aaa">Generated ${issueDate}</div>
    </div>
    <div class="sig-box">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signatory</div>
      <div class="sig-name">Autonex AI Technologies</div>
      <div class="sig-date">Date: ___________</div>
    </div>
  </div>

</div>

<!-- FOOTER -->
<div class="footer">
  <p>Thank you for your business! · <span class="hi">autonexai.org</span> · hello@autonexai.org</p>
  <p>Hyderabad, Telangana, India · ${gstEnabled ? 'GST @ 18% applied' : 'GST not applicable'}</p>
</div>

</div></body></html>`
}
