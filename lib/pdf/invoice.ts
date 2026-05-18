import { LOGO_IMG_TAG } from './logo'
import { Client } from '@/types'

export function generateInvoiceHTML(client: Client): string {
  const deposit = client.deposit_fee || client.total_fee * 0.5
  const issueDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const invoiceNum = client.invoice_number || `INV-${Date.now().toString().slice(-4)}`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Invoice — ${invoiceNum}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:13px}
.page{max-width:780px;margin:0 auto}
.header{background:#0A0F1E;padding:32px 48px;display:flex;align-items:center;justify-content:space-between}
.brand-name{font-size:18px;font-weight:700;color:white}
.brand-tagline{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-top:2px}
.invoice-label{text-align:right}
.invoice-label h1{font-size:28px;font-weight:800;color:white;letter-spacing:-1px}
.invoice-label p{font-size:12px;color:#00D4AA;font-weight:600;margin-top:2px}
.accent-bar{height:4px;background:linear-gradient(90deg,#00D4AA,#0080ff)}
.body{padding:36px 48px}
.meta-row{display:flex;justify-content:space-between;margin-bottom:32px;padding-bottom:28px;border-bottom:1px solid #eee}
.meta-box{}
.meta-box label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#00D4AA;font-weight:700;display:block;margin-bottom:6px}
.meta-box .val{font-size:13px;font-weight:700;color:#0A0F1E}
.meta-box .sub{font-size:11px;color:#888;margin-top:2px}
.parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
.party{background:#f8f9ff;border-radius:10px;padding:18px 20px;border-left:3px solid #00D4AA}
.party h3{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#00D4AA;font-weight:700;margin-bottom:10px}
.party .name{font-size:15px;font-weight:700;color:#0A0F1E;margin-bottom:6px}
.party p{font-size:12px;color:#555;margin-bottom:3px}
.section-title{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#00D4AA;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:#eee}
.inv-table{width:100%;border-collapse:collapse;margin-bottom:8px}
.inv-table th{background:#0A0F1E;color:white;text-align:left;padding:10px 16px;font-size:11px}
.inv-table th:last-child{text-align:right}
.inv-table td{padding:12px 16px;font-size:13px;border-bottom:1px solid #f0f0f0}
.inv-table td:last-child{text-align:right;font-weight:600}
.inv-table .subtotal td{background:#fafbff;font-size:12px;color:#666}
.inv-table .total td{background:#0A0F1E;color:white;font-size:14px;font-weight:800}
.inv-table .total td:last-child{color:#00D4AA;font-size:16px}
.payment-section{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.payment-box{background:#f8f9ff;border-radius:10px;padding:20px}
.payment-box h3{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#00D4AA;font-weight:700;margin-bottom:12px}
.pay-row{display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px}
.pay-row span{color:#666}
.pay-row strong{color:#0A0F1E;font-weight:600}
.note-box{background:#fff9f0;border:1px solid #ffe0b0;border-radius:8px;padding:14px 16px;margin-top:20px}
.note-box p{font-size:11px;color:#996600;line-height:1.6}
.footer{background:#f8f9ff;padding:16px 48px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;margin-top:36px}
.footer p{font-size:10px;color:#aaa}
</style></head>
<body><div class="page">

<div class="header">
  <div>
    ${LOGO_IMG_TAG()}
  </div>
  <div class="invoice-label">
    <h1>INVOICE</h1>
    <p>${invoiceNum}</p>
  </div>
</div>
<div class="accent-bar"></div>

<div class="body">

  <div class="meta-row">
    <div class="meta-box">
      <label>Issue Date</label>
      <div class="val">${issueDate}</div>
    </div>
    <div class="meta-box">
      <label>Due Date</label>
      <div class="val">${dueDate}</div>
      <div class="sub">Within 15 days of issue</div>
    </div>
    <div class="meta-box" style="text-align:right">
      <label>Amount Due</label>
      <div class="val" style="font-size:22px;color:#00D4AA">₹${deposit.toLocaleString('en-IN')}</div>
      <div class="sub">50% Deposit</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Billed From</h3>
      <div class="name">Autonex AI Technologies</div>
      <p>hello@autonexai.org</p>
      <p>autonexai.org</p>
      <p>Hyderabad, Telangana, India</p>
    </div>
    <div class="party">
      <h3>Billed To</h3>
      <div class="name">${client.name}</div>
      <p>${client.email}</p>
      ${client.phone ? `<p>${client.phone}</p>` : ''}
      ${client.company ? `<p>${client.company}</p>` : ''}
    </div>
  </div>

  <div class="section-title">Invoice Details</div>
  <table class="inv-table">
    <thead><tr><th>Description</th><th>Service</th><th>Amount</th></tr></thead>
    <tbody>
      <tr>
        <td>${client.service}<br/><span style="font-size:11px;color:#888">Full project development and delivery</span></td>
        <td style="color:#666;font-size:12px">Professional Services</td>
        <td>₹${client.total_fee.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="subtotal">
        <td colspan="2">Total Project Value</td>
        <td>₹${client.total_fee.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="subtotal">
        <td colspan="2">50% Deposit Due Now</td>
        <td style="color:#00D4AA">₹${deposit.toLocaleString('en-IN')}</td>
      </tr>
      <tr class="subtotal">
        <td colspan="2">Remaining (Due on Completion)</td>
        <td>₹${(client.total_fee - deposit).toLocaleString('en-IN')}</td>
      </tr>
      <tr class="total">
        <td colspan="2">AMOUNT DUE NOW</td>
        <td>₹${deposit.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="payment-section">
    <div class="payment-box">
      <h3>Bank Transfer</h3>
      ${client.bank_name ? `<div class="pay-row"><span>Bank</span><strong>${client.bank_name}</strong></div>` : ''}
      ${client.account_number ? `<div class="pay-row"><span>Account No.</span><strong>${client.account_number}</strong></div>` : ''}
      ${client.ifsc_code ? `<div class="pay-row"><span>IFSC Code</span><strong>${client.ifsc_code}</strong></div>` : ''}
      ${!client.bank_name ? '<p style="color:#aaa;font-size:11px">Bank details will be shared separately</p>' : ''}
    </div>
    <div class="payment-box">
      <h3>UPI Payment</h3>
      ${client.upi_id ? `<div class="pay-row"><span>UPI ID</span><strong>${client.upi_id}</strong></div>
      <div style="margin-top:10px;font-size:11px;color:#888">Scan or copy the UPI ID to pay instantly</div>` : '<p style="color:#aaa;font-size:11px">UPI ID will be shared separately</p>'}
    </div>
  </div>

  <div class="note-box">
    <p>⚠️ <strong>Important:</strong> This invoice is due within 15 days of the issue date. A late fee of 1.5% per month will be applied to overdue balances. Work will not commence until the deposit is received and confirmed. Please email proof of payment to hello@autonexai.org.</p>
  </div>
</div>

<div class="footer">
  <p>Thank you for your business! · Invoice ${invoiceNum}</p>
  <p><span style="color:#00D4AA;font-weight:600">autonexai.org</span> · hello@autonexai.org</p>
</div>

</div></body></html>`
}
