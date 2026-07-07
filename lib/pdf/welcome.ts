import QRCode from 'qrcode'
import { LOGO_IMG_TAG } from './logo'
import { Client } from '@/types'

export async function generateWelcomeHTML(client: Client, portalUrl?: string): Promise<string> {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = client.name.split(' ')[0]
  const deposit = (client.deposit_fee || client.total_fee * 0.5).toLocaleString('en-IN')

  const qrUrl = portalUrl || 'https://autonex-docs-8x12.vercel.app'
  const qrDataUri = await QRCode.toDataURL(`${qrUrl}/dashboard`, {
    width: 70, margin: 1,
    color: { dark: '#0A0F1E', light: '#FFFFFF' },
  })

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Welcome — ${client.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:13px;line-height:1.7}
.page{max-width:780px;margin:0 auto}
.header{background:#0A0F1E;padding:28px 48px;display:flex;align-items:center;justify-content:space-between}
.brand-name{font-size:18px;font-weight:700;color:white}
.brand-tagline{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase}
.doc-badge{background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:8px;padding:8px 16px;text-align:right}
.doc-badge p{font-size:9px;color:#60A5FA;letter-spacing:2px;text-transform:uppercase;font-weight:700}
.doc-badge span{font-size:13px;color:white;font-weight:600}
.accent-bar{height:4px;background:linear-gradient(90deg,#3B82F6,#0060FF)}
.hero{background:linear-gradient(135deg,#0A0F1E,#1a2744);padding:40px 48px;text-align:center}
.hero-greeting{font-size:11px;color:#60A5FA;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:12px}
.hero-name{font-size:34px;font-weight:800;color:white;letter-spacing:-1px}
.hero-sub{font-size:13px;color:rgba(255,255,255,0.5);margin-top:10px}
.body{padding:36px 48px}
.intro{font-size:13.5px;color:#444;line-height:1.85;margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #eee}
.section-title{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#60A5FA;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:#eee}
.check-item{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px}
.check-dot{width:20px;height:20px;background:rgba(96,165,250,0.15);border:1.5px solid #60A5FA;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;color:#60A5FA;font-weight:700;margin-top:2px}
.action-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
.action-card{background:#f8f9ff;border-radius:10px;padding:16px;border-top:3px solid #60A5FA;text-align:center}
.action-card .step{font-size:10px;color:#60A5FA;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.action-card h4{font-size:12px;font-weight:700;color:#0A0F1E;margin-bottom:4px}
.action-card p{font-size:11px;color:#888}
.tbl th{background:#0A0F1E;color:white;text-align:left;padding:9px 14px;font-size:11px}
.tbl td{padding:9px 14px;font-size:12px;border-bottom:1px solid #f0f0f0}
.tbl tr:nth-child(even) td{background:#fafbff}
.blue{color:#60A5FA;font-weight:700}
.contact-box{background:#0A0F1E;border-radius:12px;padding:22px 28px;display:flex;justify-content:space-between;align-items:center}
.contact-box h4{font-size:13px;font-weight:700;color:white;margin-bottom:8px}
.contact-item{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px}
.sign-off{text-align:center;margin-top:32px;padding:20px;background:#f0f5ff;border-radius:10px;border:1px solid #bfdbfe}
.footer{background:#f8f9ff;padding:16px 48px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;margin-top:36px}
.footer p{font-size:10px;color:#aaa}
</style></head>
<body><div class="page">

<div class="header">
  <div>
    ${LOGO_IMG_TAG()}
  </div>
  <div class="doc-badge"><p>Document</p><span>Client Onboarding</span></div>
</div>
<div class="accent-bar"></div>

<div class="hero">
  <p class="hero-greeting">Welcome to the Family</p>
  <h1 class="hero-name">Hello, ${firstName}! 👋</h1>
  <p class="hero-sub">We're thrilled to have you on board · ${date}</p>
</div>

<div class="body">
  <p class="intro">
    Dear <strong>${client.name}</strong>,<br/><br/>
    Congratulations on taking a powerful step toward automating your business with <strong>Autonex AI Technologies</strong>.
    We are beyond excited to begin this journey with you on your <strong>${client.service}</strong> project.
    This document outlines everything you need to get started. Please read it fully and reach out anytime.
  </p>

  <div class="section-title">What's Included in This Packet</div>
  <div style="margin-bottom:28px">
    <div class="check-item"><div class="check-dot">✓</div><div>Client Contract — Your signed service agreement outlining all terms</div></div>
    <div class="check-item"><div class="check-dot">✓</div><div>Invoice — 50% deposit invoice with all payment details</div></div>
    <div class="check-item"><div class="check-dot">✓</div><div>Project Timeline — Week-by-week breakdown of your project</div></div>
    <div class="check-item"><div class="check-dot">✓</div><div>Contact Information — How to reach your dedicated project manager</div></div>
  </div>

  <div class="section-title">What We Need From You (Within 48 Hours)</div>
  <div class="action-grid">
    <div class="action-card"><div class="step">Step 01</div><h4>Sign Contract</h4><p>Review and sign the attached client contract</p></div>
    <div class="action-card"><div class="step">Step 02</div><h4>Pay Deposit</h4><p>Transfer ₹${deposit} using invoice details</p></div>
    <div class="action-card"><div class="step">Step 03</div><h4>Share Access</h4><p>Provide platform access or assets we need</p></div>
  </div>

  <div class="section-title">Project Timeline</div>
  <table class="tbl" style="margin-bottom:28px">
    <thead><tr><th>Phase</th><th>Timeline</th><th>Deliverable</th></tr></thead>
    <tbody>
      <tr><td class="blue">Week 1</td><td>Discovery & Planning</td><td>Project brief, requirements, scope confirmation</td></tr>
      <tr><td class="blue">Week 2–3</td><td>Development</td><td>Core build, regular progress updates</td></tr>
      <tr><td class="blue">Week 4</td><td>Testing & Refinement</td><td>QA, revisions, feedback incorporation</td></tr>
      <tr><td class="blue">Week 5</td><td>Launch & Handover</td><td>Final delivery, documentation, training</td></tr>
    </tbody>
  </table>

  <div class="section-title">Your Point of Contact</div>
  <div class="contact-box">
    <div>
      <h4>Autonex AI Technologies</h4>
      <div class="contact-item">Email: <span style="color:#60A5FA">hello@autonexai.org</span></div>
      <div class="contact-item">Website: <span style="color:#60A5FA">autonexai.org</span></div>
      <div class="contact-item">Location: <span style="color:#60A5FA">Hyderabad, India</span></div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#60A5FA;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Response Time</div>
      <div style="font-size:14px;color:white;font-weight:700">Within 24 Hours</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:3px">Mon–Sat, 9AM–7PM IST</div>
    </div>
  </div>

  <div class="sign-off" style="margin-top:28px">
    <p style="font-size:14px;color:#0A0F1E;font-weight:600">With warmth and excitement,</p>
    <p style="font-size:17px;font-weight:800;color:#60A5FA;margin-top:6px">The Autonex AI Team</p>
    <p style="font-size:11px;color:#999;margin-top:4px;font-style:italic">Automate Today. Lead Tomorrow.</p>
  </div>
</div>

  <div class="footer">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="${qrDataUri}" width="46" height="46" alt="QR" style="border-radius:5px"/>
      <p>Scan to access your portal: <span style="color:#60A5FA;font-weight:600">${qrUrl}/dashboard</span></p>
    </div>
    <p><span style="color:#60A5FA;font-weight:600">autonexai.org</span> · hello@autonexai.org</p>
  </div>

</div></body></html>`
}
