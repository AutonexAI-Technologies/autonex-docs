import QRCode from 'qrcode'
import { Client } from '@/types'
import { LOGO_IMG_TAG } from './logo'

export interface ProposalData {
  title: string
  overview: string
  deliverables: string[]
  timeline_weeks: number
  total_fee: number
  deposit_fee: number
  gst_enabled?: boolean
  gst_amount?: number
  validity_days?: number
  notes?: string
  payment_schedule?: Array<{ milestone: string; amount: number; when: string }>
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

export async function generateProposalHTML(client: Client, proposal: ProposalData, portalUrl?: string): Promise<string> {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const validUntil = new Date(Date.now() + (proposal.validity_days || 14) * 86400000)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const propRef = `PROP-${client.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`

  const qrUrl = portalUrl || 'https://autonex-docs-8x12.vercel.app'
  const qrDataUri = await QRCode.toDataURL(`${qrUrl}/documents`, {
    width: 80, margin: 1,
    color: { dark: '#0A0F1E', light: '#FFFFFF' },
  })

  const subtotal = proposal.total_fee
  const gst = proposal.gst_amount || 0
  const gstEnabled = proposal.gst_enabled || gst > 0
  const grandTotal = subtotal + gst

  const paymentSchedule = proposal.payment_schedule?.length
    ? proposal.payment_schedule
    : [
        { milestone: 'Deposit (on signing)', amount: proposal.deposit_fee, when: 'Immediately' },
        { milestone: 'Balance (on completion)', amount: subtotal - proposal.deposit_fee, when: 'On project delivery' },
      ]

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Proposal for ${client.name} — Autonex AI Technologies</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,'Segoe UI',sans-serif;background:#fff;color:#1a1a2e;font-size:13px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:794px;margin:0 auto;min-height:1123px;display:flex;flex-direction:column;position:relative;overflow:hidden}

/* WATERMARK */
.wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(0,96,255,0.04);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:0;font-family:Arial}

/* HEADER */
.header{background:#0A0F1E;padding:26px 44px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
.doc-right{text-align:right}
.doc-word{font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px}
.doc-sub{font-size:10px;color:#00D4AA;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
.doc-ref{font-size:10px;color:rgba(255,255,255,0.3);margin-top:3px;font-family:monospace}

/* GRADIENT BAR */
.bar{height:4px;background:linear-gradient(90deg,#00D4AA 0%,#0060FF 60%,#7c3aed 100%);position:relative;z-index:1}

/* HERO BANNER */
.hero{background:linear-gradient(135deg,#0A0F1E 0%,#0d1f4a 100%);padding:36px 44px;position:relative;z-index:1}
.hero-label{font-size:9px;text-transform:uppercase;letter-spacing:3px;color:#00D4AA;font-weight:700;margin-bottom:10px}
.hero-title{font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;line-height:1.2;margin-bottom:12px;max-width:500px}
.hero-meta{display:flex;gap:24px;margin-top:16px;flex-wrap:wrap}
.hero-tag{font-size:11px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:6px}
.hero-tag strong{color:#fff;font-weight:700}
.valid-badge{position:absolute;right:44px;top:36px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.4);border-radius:10px;padding:10px 16px;text-align:center}
.valid-badge span{font-size:9px;color:#00D4AA;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;display:block;margin-bottom:3px}
.valid-badge strong{font-size:12px;color:#fff}

/* BODY */
.body{padding:28px 44px;flex:1;position:relative;z-index:1}

/* PARTIES */
.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px}
.party{padding:14px 18px;border-radius:12px;border:1px solid #E4E9F8;background:#F9FAFF}
.party.from{border-left:3px solid #0060FF}
.party.to{border-left:3px solid #00D4AA}
.party-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px}
.party.from .party-lbl{color:#0060FF}
.party.to .party-lbl{color:#00D4AA}
.party-name{font-size:14px;font-weight:800;color:#0A0F1E;margin-bottom:4px}
.party p{font-size:11px;color:#555;margin-bottom:2px}

/* SECTION */
.sec{display:flex;align-items:center;gap:8px;margin:20px 0 12px}
.sec span{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#0060FF;font-weight:700;white-space:nowrap}
.sec::after{content:'';flex:1;height:1px;background:#E4E9F8}

/* OVERVIEW */
.overview{background:#F9FAFF;border:1px solid #E4E9F8;border-left:3px solid #0060FF;border-radius:12px;padding:16px 20px;margin-bottom:20px;font-size:13px;color:#444;line-height:1.8}

/* DELIVERABLES */
.deliverable-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}
.deliv{display:flex;align-items:flex-start;gap:10px;background:#F9FAFF;border:1px solid #E4E9F8;border-radius:10px;padding:12px 14px;font-size:12px;color:#333}
.deliv-dot{width:20px;height:20px;background:#0060FF;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.deliv-dot svg{width:10px;height:10px;fill:none;stroke:white;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}

/* TIMELINE BAR */
.timeline{display:flex;gap:0;margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid #E4E9F8}
.tl-phase{flex:1;padding:14px 16px;background:#F9FAFF;border-right:1px solid #E4E9F8;text-align:center}
.tl-phase:last-child{border-right:none}
.tl-week{font-size:9px;color:#0060FF;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.tl-label{font-size:11px;font-weight:700;color:#0A0F1E;margin-bottom:2px}
.tl-desc{font-size:10px;color:#888}

/* PRICING */
.price-table{width:100%;border-collapse:collapse;margin-bottom:6px}
.price-table th{background:#0A0F1E;color:#fff;padding:10px 14px;font-size:10px;text-align:left;letter-spacing:.5px}
.price-table th.r{text-align:right}
.price-table td{padding:10px 14px;font-size:12.5px;border-bottom:1px solid #F0F3FA}
.price-table td.r{text-align:right}
.price-table .sub-row td{background:#F6F8FF;font-size:11.5px;color:#555;padding:8px 14px}
.price-table .gst-row td{background:#F6F8FF;font-size:11.5px;color:#555;padding:8px 14px}
.price-table .total-row td{background:#0A0F1E;color:#fff;font-size:14px;font-weight:800;padding:12px 14px}
.price-table .total-row td.r{color:#00D4AA;font-size:18px}

/* PAYMENT SCHEDULE */
.pay-sched{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:20px}
.pay-card{background:#F9FAFF;border:1px solid #E4E9F8;border-radius:10px;padding:14px 16px}
.pay-card .idx{font-size:9px;color:#0060FF;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.pay-card .amt{font-size:18px;font-weight:900;color:#0060FF;line-height:1.1;margin-bottom:4px}
.pay-card .mil{font-size:11px;font-weight:700;color:#0A0F1E;margin-bottom:2px}
.pay-card .when{font-size:10px;color:#888}

/* NOTES */
.note{background:#FFF9EC;border:1px solid #FFE0A0;border-radius:10px;padding:12px 16px;margin-bottom:20px}
.note p{font-size:11px;color:#7A5C00;line-height:1.7}

/* CTA SECTION */
.cta-section{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;background:#0A0F1E;border-radius:14px;padding:22px 26px;margin-bottom:20px}
.cta-left h3{font-size:16px;font-weight:800;color:#fff;margin-bottom:6px}
.cta-left p{font-size:11px;color:rgba(255,255,255,0.5);line-height:1.6}
.cta-right{text-align:center}
.cta-right img{border-radius:8px;margin-bottom:6px;display:block}
.cta-right p{font-size:9px;color:rgba(255,255,255,0.4);white-space:nowrap}

/* TERMS */
.terms{font-size:11px;color:#888;line-height:1.7;border-top:1px solid #E4E9F8;padding-top:16px}

/* DARK FOOTER */
.dark-footer{background:#0A0F1E;padding:12px 44px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
.dark-footer p{font-size:10px;color:rgba(255,255,255,0.4)}
.dark-footer .hi{color:#00D4AA}
</style></head>
<body><div class="page">

<div class="wm">PROPOSAL</div>

<!-- HEADER -->
<div class="header">
  <div>${LOGO_IMG_TAG(36)}</div>
  <div class="doc-right">
    <div class="doc-word">PROPOSAL</div>
    <div class="doc-sub">Project Quotation</div>
    <div class="doc-ref">${propRef}</div>
  </div>
</div>
<div class="bar"></div>

<!-- HERO BANNER -->
<div class="hero">
  <div class="hero-label">Prepared exclusively for</div>
  <div class="hero-title">${proposal.title}</div>
  <div class="hero-meta">
    <div class="hero-tag"><span>📅</span><span>Issued: <strong>${date}</strong></span></div>
    <div class="hero-tag"><span>⏱</span><span>Timeline: <strong>${proposal.timeline_weeks} Weeks</strong></span></div>
    <div class="hero-tag"><span>💰</span><span>Investment: <strong>₹${fmt(grandTotal)}</strong></span></div>
  </div>
  <div class="valid-badge">
    <span>Valid Until</span>
    <strong>${validUntil}</strong>
  </div>
</div>

<!-- BODY -->
<div class="body">

  <!-- PARTIES -->
  <div class="parties">
    <div class="party from">
      <div class="party-lbl">Proposed By</div>
      <div class="party-name">Autonex AI Technologies</div>
      <p>hello@autonexai.org</p>
      <p>autonexai.org · Hyderabad, India</p>
    </div>
    <div class="party to">
      <div class="party-lbl">Proposed To</div>
      <div class="party-name">${client.name}</div>
      <p>${client.email}</p>
      ${client.company ? `<p>${client.company}</p>` : ''}
    </div>
  </div>

  <!-- PROJECT OVERVIEW -->
  <div class="sec"><span>Project Overview</span></div>
  <div class="overview">${proposal.overview}</div>

  <!-- DELIVERABLES -->
  <div class="sec"><span>What's Included — Deliverables</span></div>
  <div class="deliverable-list">
    ${proposal.deliverables.map(d => `
    <div class="deliv">
      <div class="deliv-dot"><svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg></div>
      <span>${d}</span>
    </div>`).join('')}
  </div>

  <!-- TIMELINE -->
  <div class="sec"><span>Project Timeline — ${proposal.timeline_weeks} Weeks</span></div>
  <div class="timeline">
    <div class="tl-phase"><div class="tl-week">Week 1</div><div class="tl-label">Discovery</div><div class="tl-desc">Requirements & strategy</div></div>
    <div class="tl-phase"><div class="tl-week">Week 2–${Math.max(2, proposal.timeline_weeks - 2)}</div><div class="tl-label">Build</div><div class="tl-desc">Core development</div></div>
    <div class="tl-phase"><div class="tl-week">Week ${Math.max(3, proposal.timeline_weeks - 1)}</div><div class="tl-label">Review</div><div class="tl-desc">QA & revisions</div></div>
    <div class="tl-phase"><div class="tl-week">Week ${proposal.timeline_weeks}</div><div class="tl-label">Launch</div><div class="tl-desc">Delivery & handover</div></div>
  </div>

  <!-- PRICING -->
  <div class="sec"><span>Pricing Breakdown</span></div>
  <table class="price-table">
    <thead><tr><th>Service</th><th class="r">Amount (₹)</th></tr></thead>
    <tbody>
      <tr><td>${proposal.title}</td><td class="r">₹${fmt(subtotal)}</td></tr>
      ${gstEnabled ? `<tr class="gst-row"><td>GST @ 18%</td><td class="r">₹${fmt(gst)}</td></tr>` : ''}
      <tr class="total-row"><td>TOTAL INVESTMENT</td><td class="r">₹${fmt(grandTotal)}</td></tr>
    </tbody>
  </table>

  <!-- PAYMENT SCHEDULE -->
  <div class="sec"><span>Payment Schedule</span></div>
  <div class="pay-sched">
    ${paymentSchedule.map((p, i) => `
    <div class="pay-card">
      <div class="idx">Payment ${i + 1}</div>
      <div class="amt">₹${fmt(p.amount)}</div>
      <div class="mil">${p.milestone}</div>
      <div class="when">${p.when}</div>
    </div>`).join('')}
  </div>

  ${proposal.notes ? `<div class="note"><p>📝 <strong>Note:</strong> ${proposal.notes}</p></div>` : ''}

  <!-- CTA with QR -->
  <div class="cta-section">
    <div class="cta-left">
      <h3>Ready to move forward?</h3>
      <p>This proposal is valid until <strong style="color:#00D4AA">${validUntil}</strong>.<br/>
      Reply to this proposal or contact us to get started immediately.<br/>
      <span style="color:#00D4AA">hello@autonexai.org</span> · autonexai.org</p>
    </div>
    <div class="cta-right">
      <img src="${qrDataUri}" width="72" height="72" alt="QR"/>
      <p>Scan to view &amp; accept<br/>in your portal</p>
    </div>
  </div>

  <!-- TERMS -->
  <div class="terms">
    <strong>Terms:</strong> This proposal is valid for ${proposal.validity_days || 14} days from issue date.
    Prices are fixed for the described scope. Additional features/changes will be quoted separately.
    A signed contract and 50% deposit are required to commence work. Autonex AI Technologies reserves the right to revise pricing if scope changes significantly.
  </div>

</div>

<!-- DARK FOOTER -->
<div class="dark-footer">
  <p>Proposal Ref: <span style="font-family:monospace;color:rgba(255,255,255,0.6)">${propRef}</span></p>
  <p>Autonex AI Technologies · <span class="hi">autonexai.org</span> · hello@autonexai.org</p>
</div>

</div></body></html>`
}
