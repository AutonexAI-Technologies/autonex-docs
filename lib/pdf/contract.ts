import QRCode from 'qrcode'
import { Client } from '@/types'
import { LOGO_IMG_TAG } from './logo'

export async function generateContractHTML(client: Client, portalUrl?: string): Promise<string> {
  const deposit = client.deposit_fee || client.total_fee * 0.5
  const remaining = client.total_fee - deposit
  const date = client.start_date
    ? new Date(client.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const qrUrl = portalUrl || 'https://autonex-docs-8x12.vercel.app'
  const qrDataUri = await QRCode.toDataURL(`${qrUrl}/documents`, {
    width: 80, margin: 1,
    color: { dark: '#0A0F1E', light: '#FFFFFF' },
  })

  const contractRef = `CNT-${client.id.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Client Contract — ${client.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,'Segoe UI',sans-serif;background:#fff;color:#1a1a2e;font-size:13px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:794px;margin:0 auto;min-height:1123px;display:flex;flex-direction:column}

/* HEADER */
.header{background:#0A0F1E;padding:26px 44px;display:flex;align-items:center;justify-content:space-between}
.doc-title h1{font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;text-align:right}
.doc-title p{font-size:10px;color:#00D4AA;letter-spacing:2px;text-transform:uppercase;margin-top:4px;text-align:right}
.doc-title .ref{font-size:10px;color:rgba(255,255,255,0.35);margin-top:3px;text-align:right;font-family:monospace}

/* BAR */
.bar{height:4px;background:linear-gradient(90deg,#00D4AA 0%,#0060FF 100%)}

/* META STRIP */
.meta{background:#F6F8FF;border-bottom:1px solid #E4E9F8;padding:14px 44px;display:flex;justify-content:space-between;align-items:center}
.meta-item label{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;display:block;margin-bottom:3px}
.meta-item .val{font-size:13px;font-weight:700;color:#0A0F1E}

/* BODY */
.body{padding:28px 44px;flex:1}

/* PARTIES */
.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #E4E9F8}
.party-box{background:#F9FAFF;border-radius:12px;padding:16px 20px;border-left:3px solid #0060FF}
.party-box.client{border-left-color:#00D4AA}
.party-box h3{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;margin-bottom:10px}
.party-box.client h3{color:#00D4AA}
.party-box .name{font-size:15px;font-weight:800;color:#0A0F1E;margin-bottom:6px}
.party-box p{font-size:11px;color:#555;margin-bottom:2px}

/* SECTION */
.sec{display:flex;align-items:center;gap:8px;margin:18px 0 10px;page-break-inside:avoid;page-break-after:avoid}
.sec span{font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#0060FF;font-weight:700;white-space:nowrap;word-spacing:0}
.sec::after{content:'';flex:1;height:1px;background:#E4E9F8}

/* PROJECT TABLE */
.tbl{width:100%;border-collapse:collapse;margin-bottom:20px}
.tbl th{background:#0A0F1E;color:#fff;padding:9px 14px;font-size:10px;text-align:left;letter-spacing:.5px}
.tbl td{padding:9px 14px;font-size:12px;border-bottom:1px solid #F0F3FA;color:#1a1a2e}
.tbl tr:last-child td{background:#F6F8FF;font-weight:700;border-bottom:none}
.teal{color:#00D4AA;font-weight:700}

/* CLAUSE */
.clause{margin-bottom:16px;padding-left:12px;border-left:2px solid #E4E9F8}
.clause-num{display:inline-block;background:#0A0F1E;color:#00D4AA;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:5px;letter-spacing:.5px}
.clause h4{font-size:13px;font-weight:700;color:#0A0F1E;margin-bottom:4px}
.clause p{font-size:12px;color:#555;line-height:1.7}

/* SIGNATURES */
.sig-section{margin-top:28px;padding-top:20px;border-top:2px solid #0A0F1E}
.sig-header{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0060FF;font-weight:700;margin-bottom:16px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.sig-box{background:#F9FAFF;border-radius:12px;padding:18px 20px;border:1px solid #E4E9F8}
.sig-box .lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#0060FF;font-weight:700;margin-bottom:10px}
.sig-area{height:54px;border:1.5px dashed #C0CADC;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;background:#fff}
.sig-area span{font-size:10px;color:#C0CADC;letter-spacing:1px}
.sig-name{font-size:13px;font-weight:800;color:#0A0F1E;margin-bottom:3px}
.sig-role{font-size:10px;color:#888}
.sig-date{font-size:10px;color:#aaa;margin-top:8px;border-top:1px solid #E4E9F8;padding-top:8px}

/* QR + FOOTER */
.bottom-bar{background:#F6F8FF;border-top:1px solid #E4E9F8;padding:14px 44px;display:flex;justify-content:space-between;align-items:center;margin-top:auto}
.qr-wrap{display:flex;align-items:center;gap:10px}
.qr-wrap img{border-radius:6px}
.qr-wrap p{font-size:10px;color:#888;line-height:1.5}
.footer-text{text-align:right}
.footer-text p{font-size:10px;color:#aaa}
.footer-text .hi{color:#0060FF;font-weight:700}

/* DARK FOOTER */
.dark-footer{background:#0A0F1E;padding:12px 44px;display:flex;justify-content:space-between;align-items:center}
.dark-footer p{font-size:10px;color:rgba(255,255,255,0.4)}
.dark-footer .hi{color:#00D4AA}
</style></head>
<body><div class="page">

<!-- HEADER -->
<div class="header">
  <div>${LOGO_IMG_TAG(36)}</div>
  <div class="doc-title">
    <h1>CLIENT CONTRACT</h1>
    <p>Service Agreement</p>
    <div class="ref">${contractRef}</div>
  </div>
</div>
<div class="bar"></div>

<!-- META -->
<div class="meta">
  <div class="meta-item"><label>Contract Date</label><div class="val">${date}</div></div>
  <div class="meta-item" style="text-align:center"><label>Reference</label><div class="val" style="font-family:monospace">${contractRef}</div></div>
  <div class="meta-item" style="text-align:right"><label>Total Value</label><div class="val" style="color:#0060FF">₹${client.total_fee.toLocaleString('en-IN')}</div></div>
</div>

<!-- BODY -->
<div class="body">

  <!-- PARTIES -->
  <div class="parties">
    <div class="party-box">
      <h3>Service Provider</h3>
      <div class="name">Autonex AI Technologies</div>
      <p>hello@autonexai.org</p>
      <p>autonexai.org</p>
      <p>Hyderabad, Telangana — 500032</p>
    </div>
    <div class="party-box client">
      <h3>Client</h3>
      <div class="name">${client.name}</div>
      <p>${client.email}</p>
      ${client.phone ? `<p>${client.phone}</p>` : ''}
      ${client.company ? `<p>${client.company}</p>` : ''}
    </div>
  </div>

  <!-- PROJECT OVERVIEW -->
  <div class="sec"><span>Project Overview</span></div>
  <table class="tbl">
    <tr><th>Detail</th><th>Information</th></tr>
    <tr><td>Service</td><td>${client.service}</td></tr>
    <tr><td>Contract Date</td><td>${date}</td></tr>
    <tr><td>Total Project Fee</td><td class="teal">₹${client.total_fee.toLocaleString('en-IN')}</td></tr>
    <tr><td>Deposit (50% — Due on Signing)</td><td class="teal">₹${deposit.toLocaleString('en-IN')}</td></tr>
    <tr><td>Balance (Due on Completion)</td><td>₹${remaining.toLocaleString('en-IN')}</td></tr>
  </table>

  <!-- CLAUSES -->
  <div class="sec"><span>Terms &amp; Conditions</span></div>

  <div class="clause"><div class="clause-num">01</div><h4>Scope of Work</h4>
  <p>Autonex AI Technologies agrees to deliver the services described under "<strong>${client.service}</strong>" as mutually agreed. Exact deliverables will be detailed in a separate project brief. Any work outside the agreed scope requires a separate written agreement.</p></div>

  <div class="clause"><div class="clause-num">02</div><h4>Payment Terms</h4>
  <p>A non-refundable deposit of <strong>₹${deposit.toLocaleString('en-IN')}</strong> (50%) is due immediately on signing. The balance of <strong>₹${remaining.toLocaleString('en-IN')}</strong> is due on project completion. Work commences only after deposit confirmation. Late payments attract 1.5%/month interest.</p></div>

  <div class="clause"><div class="clause-num">03</div><h4>Timeline &amp; Milestones</h4>
  <p>Project timelines are provided in the onboarding welcome document. Delays caused by the client (late assets, approvals) extend timelines accordingly and do not constitute a breach of contract.</p></div>

  <div class="clause"><div class="clause-num">04</div><h4>Revisions Policy</h4>
  <p>Includes up to two (2) rounds of revisions within scope. Additional revisions are billed at ₹2,500/hour. Revision requests must be submitted in writing within 7 days of delivery.</p></div>

  <div class="clause"><div class="clause-num">05</div><h4>Intellectual Property</h4>
  <p>Upon full payment, all deliverables become the exclusive property of the client. Autonex AI retains the right to display work in portfolios unless instructed otherwise in writing. Third-party tools/APIs remain under their respective licenses.</p></div>

  <div class="clause"><div class="clause-num">06</div><h4>Confidentiality</h4>
  <p>Both parties agree to keep all proprietary information, trade secrets, and client data confidential. This obligation survives the termination of this contract indefinitely.</p></div>

  <div class="clause"><div class="clause-num">07</div><h4>Termination</h4>
  <p>Either party may terminate with 14 days written notice. The 50% deposit is non-refundable on client-initiated termination. Work completed to date will be invoiced. Autonex AI may terminate immediately for non-payment or breach.</p></div>

  <div class="clause"><div class="clause-num">08</div><h4>Limitation of Liability</h4>
  <p>Total liability shall not exceed fees paid by the client. We are not liable for indirect, incidental, or consequential damages including loss of profits, data, or business opportunities.</p></div>

  <div class="clause"><div class="clause-num">09</div><h4>Governing Law</h4>
  <p>Governed by the laws of India. Disputes subject to exclusive jurisdiction of courts of Hyderabad, Telangana. Both parties agree to attempt good-faith negotiation before legal proceedings.</p></div>

  <!-- SIGNATURES -->
  <div class="sig-section">
    <div class="sig-header">Digital Signature — Both parties agree to the above terms</div>
    <div class="sigs">
      <div class="sig-box">
        <div class="lbl">Service Provider</div>
        <div class="sig-area"><span>✍ SIGN HERE</span></div>
        <div class="sig-name">Autonex AI Technologies</div>
        <div class="sig-role">Authorized Signatory</div>
        <div class="sig-date">Date: ___________________________</div>
      </div>
      <div class="sig-box">
        <div class="lbl">Client</div>
        <div class="sig-area"><span>✍ SIGN HERE</span></div>
        <div class="sig-name">${client.name}</div>
        <div class="sig-role">${client.company || 'Client'}</div>
        <div class="sig-date">Date: ___________________________</div>
      </div>
    </div>
  </div>

</div>

<!-- BOTTOM BAR with QR -->
<div class="bottom-bar">
  <div class="qr-wrap">
    <img src="${qrDataUri}" width="52" height="52" alt="QR"/>
    <p>Scan to view this contract<br/>in your client portal</p>
  </div>
  <div class="footer-text">
    <p>Ref: <span style="font-family:monospace">${contractRef}</span></p>
    <p>This document is legally binding once signed by both parties</p>
  </div>
</div>

<!-- DARK FOOTER -->
<div class="dark-footer">
  <p>Autonex AI Technologies · Hyderabad, Telangana, India</p>
  <p><span class="hi">autonexai.org</span> · hello@autonexai.org</p>
</div>

</div></body></html>`
}
